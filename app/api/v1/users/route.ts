import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  getCurrentWorkspaceUser,
  requireApiAccess,
  toText,
  type WorkspaceRole,
} from '@/lib/server/geridb';

const VALID_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  const currentUser = await getCurrentWorkspaceUser(request, env);
  if (new URL(request.url).searchParams.get('me') === '1') {
    return apiJson(request, env, {
      currentUser: currentUser || {
        id: 'self-hosted-admin',
        email: '',
        name: 'Self-hosted Admin',
        role: 'admin',
        active: true,
      },
      mode: currentUser ? 'managed' : 'self-hosted',
    });
  }
  const result = await env.DB.prepare(
    'SELECT id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at FROM workspace_users ORDER BY CASE role WHEN \'admin\' THEN 0 WHEN \'editor\' THEN 1 ELSE 2 END, lower(email)',
  ).all();
  return apiJson(request, env, {
    currentUser,
    users: result.results.map((row) => {
      const user = row as Record<string, unknown>;
      return {
        id: user.id,
        platformUserId: user.platform_user_id || null,
        email: user.email,
        name: user.name,
        role: user.role,
        active: Boolean(user.active),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastSeenAt: user.last_seen_at || null,
      };
    }),
  });
}

export async function POST(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = toText(body.email).trim().toLowerCase().slice(0, 254);
    const name = toText(body.name).trim().slice(0, 120);
    const role = VALID_ROLES.includes(body.role as WorkspaceRole)
      ? (body.role as WorkspaceRole)
      : 'viewer';
    if (!/^\S+@\S+\.\S+$/.test(email))
      return apiJson(request, env, { error: 'Gültige E-Mail erforderlich.' }, 400);
    const now = new Date().toISOString();
    const id = `usr_${crypto.randomUUID()}`;
    await env.DB.prepare(
      'INSERT INTO workspace_users (id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at) VALUES (?, NULL, ?, ?, ?, 1, ?, ?, NULL)',
    )
      .bind(id, email, name, role, now, now)
      .run();
    return apiJson(
      request,
      env,
      {
        user: {
          id,
          platform_user_id: null,
          email,
          name,
          role,
          active: 1,
          created_at: now,
          updated_at: now,
          last_seen_at: null,
        },
      },
      201,
    );
  } catch (error) {
    const message = String(error).toLowerCase().includes('unique')
      ? 'Diese E-Mail ist bereits vorhanden.'
      : 'Benutzer konnte nicht angelegt werden.';
    return apiJson(request, env, { error: message }, 400);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = toText(body.id);
    const role = VALID_ROLES.includes(body.role as WorkspaceRole)
      ? (body.role as WorkspaceRole)
      : null;
    const active = typeof body.active === 'boolean' ? body.active : null;
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null;
    if (!id) return apiJson(request, env, { error: 'Benutzer-ID fehlt.' }, 400);
    const existing = await env.DB.prepare(
      'SELECT id, role, active FROM workspace_users WHERE id = ?',
    )
      .bind(id)
      .first<{ id: string; role: string; active: number }>();
    if (!existing)
      return apiJson(request, env, { error: 'Benutzer nicht gefunden.' }, 404);
    if (
      existing.role === 'admin' &&
      existing.active &&
      (role === 'editor' || role === 'viewer' || active === false)
    ) {
      const admins = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM workspace_users WHERE role = 'admin' AND active = 1",
      ).first<{ count: number }>();
      if ((admins?.count || 0) <= 1)
        return apiJson(
          request,
          env,
          { error: 'Mindestens ein aktiver Admin muss erhalten bleiben.' },
          400,
        );
    }
    const updatedAt = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE workspace_users SET name = COALESCE(?, name), role = COALESCE(?, role), active = COALESCE(?, active), updated_at = ? WHERE id = ?',
    )
      .bind(name, role, active === null ? null : active ? 1 : 0, updatedAt, id)
      .run();
    return apiJson(request, env, { id, name, role, active, updatedAt });
  } catch {
    return apiJson(
      request,
      env,
      { error: 'Benutzer konnte nicht geändert werden.' },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return apiJson(request, env, { error: 'Benutzer-ID fehlt.' }, 400);
  const currentUser = await getCurrentWorkspaceUser(request, env);
  if (currentUser?.id === id)
    return apiJson(
      request,
      env,
      { error: 'Das eigene Konto kann nicht gelöscht werden.' },
      400,
    );
  const user = await env.DB.prepare(
    'SELECT role, active FROM workspace_users WHERE id = ?',
  )
    .bind(id)
    .first<{ role: string; active: number }>();
  if (!user)
    return apiJson(request, env, { error: 'Benutzer nicht gefunden.' }, 404);
  if (user.role === 'admin' && user.active) {
    const admins = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM workspace_users WHERE role = 'admin' AND active = 1",
    ).first<{ count: number }>();
    if ((admins?.count || 0) <= 1)
      return apiJson(
        request,
        env,
        { error: 'Mindestens ein aktiver Admin muss erhalten bleiben.' },
        400,
      );
  }
  await env.DB.prepare('DELETE FROM workspace_users WHERE id = ?').bind(id).run();
  return apiJson(request, env, { deleted: id });
}
