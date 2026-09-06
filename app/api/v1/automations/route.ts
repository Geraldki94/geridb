import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
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
    const result = await env.DB.prepare(
      'SELECT id, name, trigger_type, action_type, enabled, runs, last_run FROM automations WHERE table_id = ? ORDER BY name',
    )
      .bind(tableId)
      .all();
    return apiJson(request, env, {
      automations: result.results.map((item) => ({
        id: item.id,
        name: item.name,
        trigger: item.trigger_type,
        action: item.action_type,
        enabled: Boolean(item.enabled),
        runs: item.runs,
        lastRun: item.last_run,
      })),
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
    const body = (await request.json()) as Record<string, unknown>;
    const name = toText(body.name).trim().slice(0, 100);
    const trigger = toText(body.trigger).trim().slice(0, 120);
    const action = toText(body.action).trim().slice(0, 160);
    if (!name || !trigger || !action)
      throw new Error('Name, Auslöser und Aktion sind erforderlich.');
    const automation = {
      id: `auto_${crypto.randomUUID()}`,
      name,
      trigger,
      action,
      enabled: true,
      runs: 0,
      lastRun: 'Noch nie',
    };
    await env.DB.prepare(
      'INSERT INTO automations (id, table_id, name, trigger_type, action_type, enabled, runs, last_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        automation.id,
        tableId,
        automation.name,
        automation.trigger,
        automation.action,
        1,
        0,
        automation.lastRun,
      )
      .run();
    return apiJson(request, env, { automation }, 201);
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Automation konnte nicht angelegt werden.',
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
    const body = (await request.json()) as { id?: string; enabled?: boolean };
    if (!body.id || typeof body.enabled !== 'boolean')
      return apiJson(
        request,
        env,
        { error: 'ID und Status sind erforderlich.' },
        400,
      );
    const result = await env.DB.prepare(
      'UPDATE automations SET enabled = ? WHERE id = ? AND table_id = ?',
    )
      .bind(body.enabled ? 1 : 0, body.id, tableId)
      .run();
    if (!result.meta.changes)
      return apiJson(
        request,
        env,
        { error: 'Automation nicht gefunden.' },
        404,
      );
    return apiJson(request, env, { id: body.id, enabled: body.enabled });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Automation konnte nicht geändert werden.',
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
    if (!id) throw new Error('ID ist erforderlich.');
    const result = await env.DB.prepare(
      'DELETE FROM automations WHERE id = ? AND table_id = ?',
    )
      .bind(id, tableId)
      .run();
    if (!result.meta.changes)
      return apiJson(
        request,
        env,
        { error: 'Automation nicht gefunden.' },
        404,
      );
    return apiJson(request, env, { deleted: id });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'Automation konnte nicht gelöscht werden.',
      },
      400,
    );
  }
}
