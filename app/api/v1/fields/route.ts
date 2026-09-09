import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  requireApiAccess,
  resolveFieldKey,
  resolveTableId,
  toText,
} from '@/lib/server/geridb';
import { normalizeConditionalRules } from '@/lib/conditional-format';

const VALID_TYPES = [
  'text',
  'email',
  'single-select',
  'currency',
  'date',
  'year',
  'time',
  'phone',
  'url',
  'number',
  'checkbox',
  'rating',
];
const DEFAULT_SELECT_OPTIONS = ['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'];

function cleanOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.map((option) => toText(option).trim().slice(0, 80)).filter(Boolean),
    ),
  ).slice(0, 50);
}

function parseSettings(
  value: string,
  field: { id: string; name: string; position: number },
) {
  try {
    const parsed = JSON.parse(value) as {
      key?: string;
      width?: number;
      options?: unknown;
      conditionalRules?: unknown;
    };
    return {
      key: resolveFieldKey(value, field),
      width: Number(parsed.width) || 160,
      options: cleanOptions(parsed.options),
      conditionalRules: normalizeConditionalRules(parsed.conditionalRules),
    };
  } catch {
    return {
      key: resolveFieldKey(value, field),
      width: 160,
      options: [] as string[],
      conditionalRules: [],
    };
  }
}

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
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
    return apiJson(request, env, {
      fields: result.results.map((field) => {
        const settings = parseSettings(field.settings, field);
        return {
          id: field.id,
          label: field.name,
          type: field.type,
          position: field.position,
          hidden: Boolean(field.hidden),
          ...settings,
          options:
            field.type === 'single-select'
              ? settings.options.length
                ? settings.options
                : DEFAULT_SELECT_OPTIONS
              : [],
        };
      }),
    });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Felder konnten nicht geladen werden.',
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const body = (await request.json()) as Record<string, unknown>;
    const label = toText(body.label).trim().slice(0, 80);
    const type = VALID_TYPES.includes(toText(body.type))
      ? toText(body.type)
      : 'text';
    if (!label) throw new Error('Ein Feldname ist erforderlich.');
    const count = await env.DB.prepare(
      'SELECT COUNT(*) AS count FROM fields WHERE table_id = ?',
    )
      .bind(tableId)
      .first<{ count: number }>();
    const requestedPosition = Number(body.position);
    const position = Number.isInteger(requestedPosition)
      ? Math.max(0, Math.min(requestedPosition, count?.count || 0))
      : count?.count || 0;
    const id = `fld_${crypto.randomUUID()}`;
    const key = `custom_${crypto.randomUUID().replaceAll('-', '')}`;
    const width = 160;
    const options =
      type === 'single-select'
        ? cleanOptions(body.options).length
          ? cleanOptions(body.options)
          : ['Option 1', 'Option 2']
        : [];
    const conditionalRules = normalizeConditionalRules(body.conditionalRules);
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE fields SET position = position + 1 WHERE table_id = ? AND position >= ?',
      ).bind(tableId, position),
      env.DB.prepare(
        'INSERT INTO fields (id, table_id, name, type, position, settings, hidden) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(
        id,
        tableId,
        label,
        type,
        position,
        JSON.stringify({ key, width, options, conditionalRules }),
        0,
      ),
    ]);
    return apiJson(
      request,
      env,
      {
        field: {
          id,
          key,
          label,
          type,
          position,
          width,
          hidden: false,
          options,
          conditionalRules,
        },
      },
      201,
    );
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Feld konnte nicht angelegt werden.',
      },
      400,
    );
  }
}

export async function PATCH(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const body = (await request.json()) as Record<string, unknown>;
    const id = toText(body.id);
    const existing = await env.DB.prepare(
      'SELECT name, type, hidden, position, settings FROM fields WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .first<{
        name: string;
        type: string;
        hidden: number;
        position: number;
        settings: string;
      }>();
    if (!id || !existing) throw new Error('Feld nicht gefunden.');
    const label = toText(body.label).trim().slice(0, 80) || existing.name;
    const type = VALID_TYPES.includes(toText(body.type))
      ? toText(body.type)
      : existing.type;
    const hidden =
      typeof body.hidden === 'boolean' ? body.hidden : Boolean(existing.hidden);
    const currentSettings = parseSettings(existing.settings, {
      id,
      name: existing.name,
      position: existing.position,
    });
    const options =
      type === 'single-select'
        ? Array.isArray(body.options)
          ? cleanOptions(body.options)
          : currentSettings.options.length
            ? currentSettings.options
            : DEFAULT_SELECT_OPTIONS
        : [];
    const conditionalRules = Array.isArray(body.conditionalRules)
      ? normalizeConditionalRules(body.conditionalRules)
      : currentSettings.conditionalRules;
    const result = await env.DB.prepare(
      'UPDATE fields SET name = ?, type = ?, hidden = ?, settings = ? WHERE id = ? AND table_id = ?',
    )
      .bind(
        label,
        type,
        hidden ? 1 : 0,
        JSON.stringify({
          key: currentSettings.key,
          width: currentSettings.width,
          options,
          conditionalRules,
        }),
        id,
        tableId,
      )
      .run();
    if (!result.meta.changes)
      return apiJson(request, env, { error: 'Feld nicht gefunden.' }, 404);
    return apiJson(request, env, {
      id,
      label,
      type,
      hidden,
      options,
      conditionalRules,
    });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Feld konnte nicht geändert werden.',
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Feld-ID ist erforderlich.');
    const field = await env.DB.prepare(
      'SELECT name, position, settings FROM fields WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .first<{ name: string; position: number; settings: string }>();
    if (!field)
      return apiJson(request, env, { error: 'Feld nicht gefunden.' }, 404);
    const key = parseSettings(field.settings, { id, ...field }).key;
    const jsonPath = `$."${key.replaceAll('"', '\\"')}"`;
    await env.DB.batch([
      env.DB.prepare('DELETE FROM fields WHERE id = ? AND table_id = ?').bind(
        id,
        tableId,
      ),
      env.DB.prepare(
        'UPDATE fields SET position = position - 1 WHERE table_id = ? AND position > ?',
      ).bind(tableId, field.position),
      env.DB.prepare(
        'UPDATE records SET values_json = json_remove(values_json, ?), updated_at = ? WHERE table_id = ?',
      ).bind(jsonPath, new Date().toISOString(), tableId),
    ]);
    return apiJson(request, env, { deleted: id });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Feld konnte nicht gelöscht werden.',
      },
      400,
    );
  }
}
