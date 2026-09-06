import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  cleanRecord,
  requireApiAccess,
  resolveTableId,
  toText,
} from '@/lib/server/geridb';

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const search = (
      new URL(request.url).searchParams.get('search') || ''
    ).toLowerCase();
    const result = await env.DB.prepare(
      'SELECT id, values_json FROM records WHERE table_id = ? ORDER BY updated_at DESC LIMIT 500',
    )
      .bind(tableId)
      .all<{ id: string; values_json: string }>();
    const records = result.results
      .map((row) => ({ id: row.id, ...JSON.parse(row.values_json) }))
      .filter(
        (record) =>
          !search || JSON.stringify(record).toLowerCase().includes(search),
      );
    return apiJson(request, env, {
      records,
      meta: { total: records.length, tableId },
    });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error ? error.message : 'Datenbank nicht verfügbar.',
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const values = cleanRecord(await request.json());
    const id = `rec_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO records (id, table_id, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, tableId, JSON.stringify(values), now, now)
      .run();
    return apiJson(request, env, { record: { id, ...values } }, 201);
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht angelegt werden.',
      },
      400,
    );
  }
}

export async function PATCH(request: Request) {
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const body = (await request.json()) as Record<string, unknown>;
    const id = toText(body.id);
    if (!id) throw new Error('ID ist erforderlich.');
    const existing = await env.DB.prepare(
      'SELECT values_json FROM records WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .first<{ values_json: string }>();
    if (!existing)
      return apiJson(request, env, { error: 'Datensatz nicht gefunden.' }, 404);
    const values = cleanRecord({
      ...JSON.parse(existing.values_json),
      ...body,
    });
    await env.DB.prepare(
      'UPDATE records SET values_json = ?, updated_at = ? WHERE id = ? AND table_id = ?',
    )
      .bind(JSON.stringify(values), new Date().toISOString(), id, tableId)
      .run();
    return apiJson(request, env, { record: { id, ...values } });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht geändert werden.',
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id)
      return apiJson(request, env, { error: 'ID ist erforderlich.' }, 400);
    const result = await env.DB.prepare(
      'DELETE FROM records WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .run();
    if (!result.meta.changes)
      return apiJson(request, env, { error: 'Datensatz nicht gefunden.' }, 404);
    return apiJson(request, env, { deleted: id });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht gelöscht werden.',
      },
      400,
    );
  }
}
