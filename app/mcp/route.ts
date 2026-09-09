import { env } from 'cloudflare:workers';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import {
  apiOptions,
  cleanRecord,
  ensureSeed,
  requireApiAccess,
  resolveFieldKey,
  type WorkspaceRole,
} from '@/lib/server/geridb';

type FieldSchema = {
  id: string;
  key: string;
  label: string;
  type: string;
  position: number;
  hidden: boolean;
  options: string[];
};

type RecordRow = {
  id: string;
  values_json: string;
  created_at: string;
  updated_at: string;
};

const MCP_WRITE_TOOLS = new Set([
  'create_record',
  'update_record',
  'delete_record',
]);

function jsonResult(value: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

async function requireTable(tableId: string) {
  await ensureSeed(env.DB);
  const table = await env.DB.prepare(
    'SELECT id, name FROM data_tables WHERE id = ? LIMIT 1',
  )
    .bind(tableId)
    .first<{ id: string; name: string }>();
  if (!table)
    throw new Error('Tabelle nicht gefunden. Nutze zuerst list_tables.');
  return table;
}

async function loadFieldSchema(tableId: string) {
  await requireTable(tableId);
  const result = await env.DB.prepare(
    'SELECT id, name, type, position, settings, hidden FROM fields WHERE table_id = ? ORDER BY position',
  )
    .bind(tableId)
    .all<{
      id: string;
      name: string;
      type: string;
      position: number;
      settings: string;
      hidden: number;
    }>();
  return result.results.map((field): FieldSchema => {
    let options: string[] = [];
    try {
      const settings = JSON.parse(field.settings) as { options?: unknown };
      if (Array.isArray(settings.options))
        options = settings.options
          .filter((option): option is string => typeof option === 'string')
          .slice(0, 50);
    } catch {
      // Legacy field settings may not be valid JSON.
    }
    return {
      id: field.id,
      key: resolveFieldKey(field.settings, field),
      label: field.name,
      type: field.type,
      position: field.position,
      hidden: Boolean(field.hidden),
      options,
    };
  });
}

function emptyFieldValue(type: string) {
  if (type === 'checkbox') return false;
  if (type === 'number' || type === 'currency' || type === 'rating') return 0;
  return '';
}

function materializeRecord(
  fields: FieldSchema[],
  value: Record<string, unknown>,
) {
  const input = cleanRecord(value);
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      Object.hasOwn(input, field.key)
        ? input[field.key]
        : emptyFieldValue(field.type),
    ]),
  );
}

function parseValues(row: RecordRow, fields: FieldSchema[]) {
  return {
    id: row.id,
    ...materializeRecord(fields, JSON.parse(row.values_json)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createGeriDbMcpServer() {
  const server = new McpServer(
    { name: 'geridb', version: '0.2.0' },
    {
      instructions:
        'Verwende list_tables und get_fields, bevor du Datensätze liest oder schreibst. Feldwerte werden über die stabilen Feldschlüssel angesprochen.',
    },
  );

  server.registerTool(
    'list_tables',
    {
      title: 'GeriDB-Tabellen auflisten',
      description: 'Listet alle verfügbaren Datenbanken und Tabellen auf.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      await ensureSeed(env.DB);
      const result = await env.DB.prepare(
        `SELECT data_tables.id, data_tables.name, data_tables.description,
          bases.id AS base_id, bases.name AS database_name
         FROM data_tables
         INNER JOIN bases ON bases.id = data_tables.base_id
         ORDER BY lower(bases.name), lower(data_tables.name)`,
      ).all();
      return jsonResult({ tables: result.results });
    },
  );

  server.registerTool(
    'get_fields',
    {
      title: 'Tabellenfelder lesen',
      description:
        'Liefert Feldschlüssel, Bezeichnungen, Datentypen und Auswahloptionen einer Tabelle.',
      inputSchema: z.object({
        table_id: z.string().min(1).describe('Tabellen-ID aus list_tables'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ table_id }) =>
      jsonResult({
        tableId: table_id,
        fields: await loadFieldSchema(table_id),
      }),
  );

  server.registerTool(
    'search_records',
    {
      title: 'Datensätze suchen',
      description:
        'Durchsucht Datensätze einer Tabelle als Volltext und gibt die neuesten Treffer zurück.',
      inputSchema: z.object({
        table_id: z.string().min(1).describe('Tabellen-ID aus list_tables'),
        search: z.string().max(200).default('').describe('Optionaler Suchtext'),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ table_id, search, limit }) => {
      const fields = await loadFieldSchema(table_id);
      const result = await env.DB.prepare(
        'SELECT id, values_json, created_at, updated_at FROM records WHERE table_id = ? ORDER BY updated_at DESC LIMIT 500',
      )
        .bind(table_id)
        .all<RecordRow>();
      const needle = search.trim().toLocaleLowerCase('de');
      const records = result.results
        .map((row) => parseValues(row, fields))
        .filter(
          (record) =>
            !needle ||
            JSON.stringify(record).toLocaleLowerCase('de').includes(needle),
        )
        .slice(0, limit);
      return jsonResult({ tableId: table_id, count: records.length, records });
    },
  );

  server.registerTool(
    'get_record',
    {
      title: 'Datensatz lesen',
      description: 'Liest einen einzelnen Datensatz anhand seiner ID.',
      inputSchema: z.object({
        table_id: z.string().min(1),
        record_id: z.string().min(1),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ table_id, record_id }) => {
      const fields = await loadFieldSchema(table_id);
      const row = await env.DB.prepare(
        'SELECT id, values_json, created_at, updated_at FROM records WHERE id = ? AND table_id = ? LIMIT 1',
      )
        .bind(record_id, table_id)
        .first<RecordRow>();
      if (!row) throw new Error('Datensatz nicht gefunden.');
      return jsonResult({ record: parseValues(row, fields) });
    },
  );

  server.registerTool(
    'create_record',
    {
      title: 'Datensatz anlegen',
      description:
        'Legt einen Datensatz an. Verwende die Feldschlüssel aus get_fields.',
      inputSchema: z.object({
        table_id: z.string().min(1),
        values: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ table_id, values }) => {
      const fields = await loadFieldSchema(table_id);
      const normalized = materializeRecord(fields, values);
      const id = `rec_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO records (id, table_id, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
        .bind(id, table_id, JSON.stringify(normalized), now, now)
        .run();
      return jsonResult({
        record: { id, ...normalized, createdAt: now, updatedAt: now },
      });
    },
  );

  server.registerTool(
    'update_record',
    {
      title: 'Datensatz aktualisieren',
      description: 'Aktualisiert einzelne Werte eines vorhandenen Datensatzes.',
      inputSchema: z.object({
        table_id: z.string().min(1),
        record_id: z.string().min(1),
        values: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ table_id, record_id, values }) => {
      const fields = await loadFieldSchema(table_id);
      const existing = await env.DB.prepare(
        'SELECT id, values_json, created_at, updated_at FROM records WHERE id = ? AND table_id = ? LIMIT 1',
      )
        .bind(record_id, table_id)
        .first<RecordRow>();
      if (!existing) throw new Error('Datensatz nicht gefunden.');
      const normalized = materializeRecord(fields, {
        ...JSON.parse(existing.values_json),
        ...values,
      });
      const updatedAt = new Date().toISOString();
      await env.DB.prepare(
        'UPDATE records SET values_json = ?, updated_at = ? WHERE id = ? AND table_id = ?',
      )
        .bind(JSON.stringify(normalized), updatedAt, record_id, table_id)
        .run();
      return jsonResult({
        record: {
          id: record_id,
          ...normalized,
          createdAt: existing.created_at,
          updatedAt,
        },
      });
    },
  );

  server.registerTool(
    'delete_record',
    {
      title: 'Datensatz löschen',
      description: 'Löscht einen Datensatz endgültig.',
      inputSchema: z.object({
        table_id: z.string().min(1),
        record_id: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ table_id, record_id }) => {
      await requireTable(table_id);
      const result = await env.DB.prepare(
        'DELETE FROM records WHERE id = ? AND table_id = ?',
      )
        .bind(record_id, table_id)
        .run();
      if (!result.meta.changes) throw new Error('Datensatz nicht gefunden.');
      return jsonResult({ deleted: record_id, tableId: table_id });
    },
  );

  return server;
}

const handler = createMcpHandler(() => createGeriDbMcpServer(), {
  legacy: 'stateless',
});

function requestedRole(body: unknown): WorkspaceRole {
  const messages = Array.isArray(body) ? body : [body];
  const writes = messages.some((message) => {
    if (!message || typeof message !== 'object') return false;
    const value = message as { method?: unknown; params?: { name?: unknown } };
    return (
      value.method === 'tools/call' &&
      typeof value.params?.name === 'string' &&
      MCP_WRITE_TOOLS.has(value.params.name)
    );
  });
  return writes ? 'editor' : 'viewer';
}

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function POST(request: Request) {
  const parsedBody = await request
    .clone()
    .json()
    .catch(() => undefined);
  const denied = await requireApiAccess(
    request,
    env,
    requestedRole(parsedBody),
  );
  if (denied) return denied;
  return handler.fetch(request, { parsedBody });
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(request, env, 'viewer');
  if (denied) return denied;
  return handler.fetch(request);
}

export async function DELETE(request: Request) {
  const denied = await requireApiAccess(request, env, 'viewer');
  if (denied) return denied;
  return handler.fetch(request);
}
