import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  requireApiAccess,
  resolveTableId,
  toText,
} from '@/lib/server/geridb';

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
const CORE_KEYS = ['company', 'contact', 'email', 'status', 'value', 'date'];

function parseSettings(value: string, position: number) {
  try {
    const parsed = JSON.parse(value) as { key?: string; width?: number };
    return {
      key: parsed.key || CORE_KEYS[position] || `custom_${position}`,
      width: Number(parsed.width) || 160,
    };
  } catch {
    return { key: CORE_KEYS[position] || `custom_${position}`, width: 160 };
  }
}

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = requireApiAccess(request, env);
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
      fields: result.results.map((field) => ({
        id: field.id,
        label: field.name,
        type: field.type,
        position: field.position,
        hidden: Boolean(field.hidden),
        ...parseSettings(field.settings, field.position),
      })),
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
  const denied = requireApiAccess(request, env);
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
        JSON.stringify({ key, width }),
        0,
      ),
    ]);
    return apiJson(
      request,
      env,
      { field: { id, key, label, type, position, width, hidden: false } },
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
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const body = (await request.json()) as Record<string, unknown>;
    const id = toText(body.id);
    const existing = await env.DB.prepare(
      'SELECT name, type, hidden FROM fields WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .first<{ name: string; type: string; hidden: number }>();
    if (!id || !existing) throw new Error('Feld nicht gefunden.');
    const label = toText(body.label).trim().slice(0, 80) || existing.name;
    const type = VALID_TYPES.includes(toText(body.type))
      ? toText(body.type)
      : existing.type;
    const hidden =
      typeof body.hidden === 'boolean' ? body.hidden : Boolean(existing.hidden);
    const result = await env.DB.prepare(
      'UPDATE fields SET name = ?, type = ?, hidden = ? WHERE id = ? AND table_id = ?',
    )
      .bind(label, type, hidden ? 1 : 0, id, tableId)
      .run();
    if (!result.meta.changes)
      return apiJson(request, env, { error: 'Feld nicht gefunden.' }, 404);
    return apiJson(request, env, { id, label, type, hidden });
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
  const denied = requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const tableId = await resolveTableId(env.DB, request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Feld-ID ist erforderlich.');
    const field = await env.DB.prepare(
      'SELECT position, settings FROM fields WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .first<{ position: number; settings: string }>();
    if (!field)
      return apiJson(request, env, { error: 'Feld nicht gefunden.' }, 404);
    const key = parseSettings(field.settings, field.position).key;
    if (CORE_KEYS.includes(key))
      return apiJson(
        request,
        env,
        { error: 'Die sechs Basisfelder können nicht gelöscht werden.' },
        400,
      );
    await env.DB.prepare('DELETE FROM fields WHERE id = ? AND table_id = ?')
      .bind(id, tableId)
      .run();
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
