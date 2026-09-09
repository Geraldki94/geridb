import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  clearSessionCookie,
  createPasswordSession,
  deletePasswordSession,
  getAuthenticatedIdentity,
  getRequestWorkspaceAuth,
  hashPassword,
  isSameOriginRequest,
  passwordSetupRequired,
  passwordValidationError,
  toText,
  verifyPassword,
} from '@/lib/server/geridb';

type LoginUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: number;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
};

const DUMMY_PASSWORD_HASH =
  'pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function noStore(response: Response) {
  response.headers.set('cache-control', 'no-store');
  return response;
}

function withSessionCookie(response: Response, cookie: string) {
  response.headers.set('set-cookie', cookie);
  return noStore(response);
}

function publicUser(row: LoginUserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: Boolean(row.active),
  };
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  try {
    const authentication = await getRequestWorkspaceAuth(request, env);
    const setupRequired = await passwordSetupRequired(env.DB);
    return noStore(
      apiJson(request, env, {
        authenticated: Boolean(authentication?.user.active),
        setupRequired,
        authMode: authentication?.mode || null,
        platformAuthenticated: Boolean(getAuthenticatedIdentity(request)),
        currentUser: authentication?.user || null,
      }),
    );
  } catch {
    return noStore(
      apiJson(
        request,
        env,
        { error: 'Der Anmeldestatus konnte nicht geladen werden.' },
        503,
      ),
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return apiJson(request, env, { error: 'Ungültiger Anfrageursprung.' }, 403);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = toText(body.action);

    if (action === 'logout') {
      await deletePasswordSession(env.DB, request);
      return withSessionCookie(
        apiJson(request, env, { authenticated: false }),
        clearSessionCookie(request),
      );
    }

    if (action === 'setup') {
      if (!(await passwordSetupRequired(env.DB)))
        return apiJson(
          request,
          env,
          { error: 'GeriDB wurde bereits eingerichtet.' },
          409,
        );
      const email = toText(body.email).trim().toLowerCase().slice(0, 254);
      const name = toText(body.name).trim().slice(0, 120);
      const password = toText(body.password);
      if (!validEmail(email))
        return apiJson(
          request,
          env,
          { error: 'Gültige E-Mail erforderlich.' },
          400,
        );
      const validationError = passwordValidationError(password);
      if (validationError)
        return apiJson(request, env, { error: validationError }, 400);
      const passwordHash = await hashPassword(password);
      const newId = `usr_${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE workspace_users
           SET name = ?, role = 'admin', active = 1, password_hash = ?,
             failed_login_attempts = 0, locked_until = NULL,
             updated_at = ?, last_seen_at = ?
           WHERE email = ?
             AND NOT EXISTS (
               SELECT 1 FROM workspace_users WHERE password_hash IS NOT NULL
             )`,
        ).bind(name || email, passwordHash, now, now, email),
        env.DB.prepare(
          `INSERT INTO workspace_users (
            id, platform_user_id, email, name, role, active, created_at,
            updated_at, last_seen_at, password_hash, failed_login_attempts,
            locked_until
          )
          SELECT ?, NULL, ?, ?, 'admin', 1, ?, ?, ?, ?, 0, NULL
          WHERE NOT EXISTS (
            SELECT 1 FROM workspace_users WHERE password_hash IS NOT NULL
          )`,
        ).bind(newId, email, name || email, now, now, now, passwordHash),
      ]);
      const created = await env.DB.prepare(
        `SELECT id, email, name, role, active, password_hash,
          failed_login_attempts, locked_until
         FROM workspace_users
         WHERE email = ? AND password_hash = ?
         LIMIT 1`,
      )
        .bind(email, passwordHash)
        .first<LoginUserRow>();
      if (!created)
        return apiJson(
          request,
          env,
          { error: 'GeriDB wurde zwischenzeitlich bereits eingerichtet.' },
          409,
        );
      const session = await createPasswordSession(env.DB, request, created.id);
      return withSessionCookie(
        apiJson(request, env, {
          authenticated: true,
          authMode: 'password',
          currentUser: publicUser(created),
        }),
        session.cookie,
      );
    }

    if (action !== 'login')
      return apiJson(request, env, { error: 'Unbekannte Aktion.' }, 400);

    const email = toText(body.email).trim().toLowerCase().slice(0, 254);
    const password = toText(body.password);
    const row = await env.DB.prepare(
      `SELECT id, email, name, role, active, password_hash,
        failed_login_attempts, locked_until
       FROM workspace_users
       WHERE email = ?
       LIMIT 1`,
    )
      .bind(email)
      .first<LoginUserRow>();
    const now = new Date();
    if (row?.locked_until && new Date(row.locked_until) > now)
      return apiJson(
        request,
        env,
        { error: 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.' },
        429,
      );
    const passwordMatches = await verifyPassword(
      password,
      row?.password_hash || DUMMY_PASSWORD_HASH,
    );
    if (!row || !row.active || !passwordMatches) {
      if (row) {
        const attempts =
          row.locked_until && new Date(row.locked_until) <= now
            ? 1
            : row.failed_login_attempts + 1;
        const lockedUntil =
          attempts >= 5
            ? new Date(now.getTime() + 15 * 60 * 1000).toISOString()
            : null;
        await env.DB.prepare(
          'UPDATE workspace_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        )
          .bind(attempts, lockedUntil, row.id)
          .run();
      }
      return apiJson(
        request,
        env,
        { error: 'E-Mail oder Passwort ist nicht korrekt.' },
        401,
      );
    }

    await env.DB.prepare(
      'UPDATE workspace_users SET failed_login_attempts = 0, locked_until = NULL, last_seen_at = ? WHERE id = ?',
    )
      .bind(now.toISOString(), row.id)
      .run();
    const session = await createPasswordSession(env.DB, request, row.id);
    return withSessionCookie(
      apiJson(request, env, {
        authenticated: true,
        authMode: 'password',
        currentUser: publicUser(row),
      }),
      session.cookie,
    );
  } catch {
    return noStore(
      apiJson(
        request,
        env,
        { error: 'Die Anmeldung konnte nicht verarbeitet werden.' },
        500,
      ),
    );
  }
}
