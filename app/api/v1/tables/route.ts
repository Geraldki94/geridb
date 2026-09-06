import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  ensureSeed,
  requireApiAccess,
  SEED_TABLES,
  toText,
} from '@/lib/server/geridb';

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    await ensureSeed(env.DB);
    const result = await env.DB.prepare(
      'SELECT id, base_id, name, description, created_at FROM data_tables ORDER BY created_at, name',
    ).all<{
      id: string;
      base_id: string;
      name: string;
      description: string;
      created_at: string;
    }>();
    const tables = result.results.map((table, index) => {
      const seeded = SEED_TABLES.find((item) => item.id === table.id);
      return {
        id: table.id,
        baseId: table.base_id,
        name: seeded?.name || table.name,
        title: seeded?.title || table.name,
        description: table.description,
        color: seeded?.color || ['cobalt', 'violet', 'amber'][index % 3],
      };
    });
    return apiJson(request, env, { tables });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Tabellen konnten nicht geladen werden.',
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    await ensureSeed(env.DB);
    const body = (await request.json()) as Record<string, unknown>;
    const name = toText(body.name).trim().slice(0, 80);
    const fromCsv = body.fromCsv === true;
    if (!name) throw new Error('Ein Tabellenname ist erforderlich.');
    const duplicate = await env.DB.prepare(
      'SELECT id FROM data_tables WHERE lower(name) = lower(?)',
    )
      .bind(name)
      .first();
    if (duplicate)
      throw new Error('Eine Tabelle mit diesem Namen existiert bereits.');

    const id = `tbl_${crypto.randomUUID()}`;
    const baseId = `base_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const defaults = [
      ['company', 'Name', 'text', 220],
      ['contact', 'Kontakt', 'text', 170],
      ['email', 'E-Mail', 'email', 210],
      ['status', 'Status', 'single-select', 130],
      ['value', 'Wert', 'currency', 125],
      ['date', 'Datum', 'date', 160],
    ] as const;
    const description = fromCsv
      ? 'Aus CSV importierte Tabelle'
      : 'Benutzerdefinierte Tabelle';
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO bases (id, name, created_at) VALUES (?, ?, ?)',
      ).bind(baseId, name, now),
      env.DB.prepare(
        'INSERT INTO data_tables (id, base_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(id, baseId, name, description, now),
      ...(fromCsv
        ? []
        : defaults.map(([key, fieldName, type, width], position) =>
            env.DB.prepare(
              'INSERT INTO fields (id, table_id, name, type, position, settings, hidden) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ).bind(
              `fld_${crypto.randomUUID()}`,
              id,
              fieldName,
              type,
              position,
              JSON.stringify({ key, width }),
              0,
            ),
          )),
    ]);
    return apiJson(
      request,
      env,
      {
        table: {
          id,
          baseId,
          name,
          title: name,
          description,
          color: 'cobalt',
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
            : 'Tabelle konnte nicht angelegt werden.',
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    await ensureSeed(env.DB);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Tabellen-ID ist erforderlich.');
    if (SEED_TABLES.some((table) => table.id === id))
      throw new Error(
        'Die drei Beispieltabellen können nicht gelöscht werden.',
      );
    const table = await env.DB.prepare(
      'SELECT base_id FROM data_tables WHERE id = ?',
    )
      .bind(id)
      .first<{ base_id: string }>();
    if (!table)
      return apiJson(request, env, { error: 'Tabelle nicht gefunden.' }, 404);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM records WHERE table_id = ?').bind(id),
      env.DB.prepare('DELETE FROM fields WHERE table_id = ?').bind(id),
      env.DB.prepare('DELETE FROM automations WHERE table_id = ?').bind(id),
      env.DB.prepare('DELETE FROM data_tables WHERE id = ?').bind(id),
      env.DB.prepare('DELETE FROM bases WHERE id = ?').bind(table.base_id),
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
            : 'Tabelle konnte nicht gelöscht werden.',
      },
      400,
    );
  }
}
