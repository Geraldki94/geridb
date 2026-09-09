import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  getRequestWorkspaceAuth,
  hashPassword,
  passwordValidationError,
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
  const authentication = await getRequestWorkspaceAuth(request, env);
  const currentUser = authentication?.user || null;
  if (new URL(request.url).searchParams.get('me') === '1') {
    return apiJson(request, env, {
      currentUser,
      authMode: authentication?.mode || null,
    });
  }
  const result = await env.DB.prepare(
    "SELECT id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at, password_hash FROM workspace_users ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, lower(email)",
  ).all();
  return apiJson(request, env, {
    currentUser,
    authMode: authentication?.mode || null,
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
        passwordConfigured: Boolean(user.password_hash),
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
    const authentication = await getRequestWorkspaceAuth(request, env);
    const password = toText(body.password);
    if (!/^\S+@\S+\.\S+$/.test(email))
      return apiJson(
        request,
        env,
        { error: 'Gültige E-Mail erforderlich.' },
        400,
      );
    if (authentication?.mode === 'password') {
      const validationError = passwordValidationError(password);
      if (validationError)
        return apiJson(request, env, { error: validationError }, 400);
    }
    const passwordHash = password ? await hashPassword(password) : null;
    const now = new Date().toISOString();
    const id = `usr_${crypto.randomUUID()}`;
    await env.DB.prepare(
      'INSERT INTO workspace_users (id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at, password_hash, failed_login_attempts, locked_until) VALUES (?, NULL, ?, ?, ?, 1, ?, ?, NULL, ?, 0, NULL)',
    )
      .bind(id, email, name, role, now, now, passwordHash)
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
          passwordConfigured: Boolean(passwordHash),
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
    const name =
      typeof body.name === 'string' ? body.name.trim().slice(0, 120) : null;
    const password = typeof body.password === 'string' ? body.password : '';
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
    if (password) {
      const validationError = passwordValidationError(password);
      if (validationError)
        return apiJson(request, env, { error: validationError }, 400);
    }
    const passwordHash = password ? await hashPassword(password) : null;
    const updatedAt = new Date().toISOString();
    const update = env.DB.prepare(
      'UPDATE workspace_users SET name = COALESCE(?, name), role = COALESCE(?, role), active = COALESCE(?, active), password_hash = COALESCE(?, password_hash), failed_login_attempts = CASE WHEN ? IS NULL THEN failed_login_attempts ELSE 0 END, locked_until = CASE WHEN ? IS NULL THEN locked_until ELSE NULL END, updated_at = ? WHERE id = ?',
    ).bind(
      name,
      role,
      active === null ? null : active ? 1 : 0,
      passwordHash,
      passwordHash,
      passwordHash,
      updatedAt,
      id,
    );
    const currentUser = (await getRequestWorkspaceAuth(request, env))?.user;
    await env.DB.batch([
      update,
      ...(passwordHash && currentUser?.id !== id
        ? [
            env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(
              id,
            ),
          ]
        : []),
    ]);
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
  const currentUser = (await getRequestWorkspaceAuth(request, env))?.user;
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
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM workspace_users WHERE id = ?').bind(id),
  ]);
  return apiJson(request, env, { deleted: id });
}
