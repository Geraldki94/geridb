export type SeedField = {
  id: string;
  key: string;
  name: string;
  type: string;
  width: number;
};

export type ApiEnvironment = {
  DB?: D1Database;
  GERIDB_API_KEY?: string;
  GERIDB_ALLOWED_ORIGIN?: string;
};

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export type WorkspaceUser = {
  id: string;
  platformUserId: string | null;
  email: string;
  name: string;
  role: WorkspaceRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
};

type WorkspaceUserRow = {
  id: string;
  platform_user_id: string | null;
  email: string;
  name: string;
  role: string;
  active: number;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
};

export type WorkspaceAuth = {
  user: WorkspaceUser;
  mode: 'platform' | 'password';
};

const SESSION_COOKIE_NAME = 'geridb_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_PREFIX = 'pbkdf2-sha256';

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

function normalizeWorkspaceRole(value: string): WorkspaceRole {
  return value === 'admin' || value === 'editor' ? value : 'viewer';
}

function mapWorkspaceUser(row: WorkspaceUserRow): WorkspaceUser {
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    email: row.email,
    name: row.name,
    role: normalizeWorkspaceRole(row.role),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at,
  };
}

function decodeAuthenticatedName(request: Request) {
  const encoded = request.headers.get('oai-authenticated-user-full-name');
  const encoding = request.headers.get(
    'oai-authenticated-user-full-name-encoding',
  );
  if (!encoded || encoding !== 'percent-encoded-utf-8') return '';
  try {
    return decodeURIComponent(encoded).trim().slice(0, 120);
  } catch {
    return '';
  }
}

export function getAuthenticatedIdentity(request: Request) {
  const platformUserId = request.headers
    .get('oai-authenticated-user-id')
    ?.trim();
  const email = request.headers
    .get('oai-authenticated-user-email')
    ?.trim()
    .toLowerCase();
  if (!platformUserId || !email) return null;
  return {
    platformUserId: platformUserId.slice(0, 200),
    email: email.slice(0, 254),
    name: decodeAuthenticatedName(request),
  };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let value = '';
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function randomToken(bytes = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function passwordValidationError(password: string) {
  if (password.length < 12)
    return 'Das Passwort muss mindestens 12 Zeichen lang sein.';
  if (password.length > 128)
    return 'Das Passwort darf höchstens 128 Zeichen lang sein.';
  return '';
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt).buffer,
      iterations,
    },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const validationError = passwordValidationError(password);
  if (validationError) throw new Error(validationError);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `${PASSWORD_PREFIX}$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationsText, saltText, expectedText] =
    encoded.split('$');
  const iterations = Number(iterationsText);
  if (
    algorithm !== PASSWORD_PREFIX ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !saltText ||
    !expectedText
  )
    return false;
  try {
    const actual = await derivePassword(
      password,
      base64UrlToBytes(saltText),
      iterations,
    );
    const expected = base64UrlToBytes(expectedText);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1)
      difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name)
      return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return '';
}

function secureRequest(request: Request) {
  return (
    new URL(request.url).protocol === 'https:' ||
    request.headers.get('x-forwarded-proto') === 'https'
  );
}

export function clearSessionCookie(request: Request) {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureRequest(request) ? '; Secure' : ''}`;
}

export async function createPasswordSession(
  db: D1Database,
  request: Request,
  userId: string,
) {
  const token = randomToken();
  const tokenHash = await hashApiKey(token);
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_MAX_AGE_SECONDS * 1000,
  ).toISOString();
  await db.batch([
    db
      .prepare('DELETE FROM auth_sessions WHERE expires_at <= ?')
      .bind(now.toISOString()),
    db
      .prepare(
        'INSERT INTO auth_sessions (id, token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(
        `ses_${crypto.randomUUID()}`,
        tokenHash,
        userId,
        now.toISOString(),
        expiresAt,
        now.toISOString(),
      ),
  ]);
  return {
    expiresAt,
    cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secureRequest(request) ? '; Secure' : ''}`,
  };
}

export async function deletePasswordSession(db: D1Database, request: Request) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return;
  await db
    .prepare('DELETE FROM auth_sessions WHERE token_hash = ?')
    .bind(await hashApiKey(token))
    .run();
}

export async function getCurrentWorkspaceUser(
  request: Request,
  environment: ApiEnvironment & { DB: D1Database },
) {
  const identity = getAuthenticatedIdentity(request);
  if (!identity) return null;
  let row = await environment.DB.prepare(
    'SELECT id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at FROM workspace_users WHERE platform_user_id = ? OR email = ? ORDER BY CASE WHEN platform_user_id = ? THEN 0 ELSE 1 END LIMIT 1',
  )
    .bind(identity.platformUserId, identity.email, identity.platformUserId)
    .first<WorkspaceUserRow>();
  const now = new Date().toISOString();

  if (!row) {
    const count = await environment.DB.prepare(
      'SELECT COUNT(*) AS count FROM workspace_users',
    ).first<{ count: number }>();
    if ((count?.count || 0) > 0) return null;
    const id = `usr_${crypto.randomUUID()}`;
    await environment.DB.prepare(
      'INSERT INTO workspace_users (id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)',
    )
      .bind(
        id,
        identity.platformUserId,
        identity.email,
        identity.name,
        'admin',
        now,
        now,
        now,
      )
      .run();
    row = await environment.DB.prepare(
      'SELECT id, platform_user_id, email, name, role, active, created_at, updated_at, last_seen_at FROM workspace_users WHERE id = ?',
    )
      .bind(id)
      .first<WorkspaceUserRow>();
  } else {
    await environment.DB.prepare(
      'UPDATE workspace_users SET platform_user_id = ?, name = CASE WHEN ? != ? THEN ? ELSE name END, last_seen_at = ?, updated_at = ? WHERE id = ?',
    )
      .bind(
        identity.platformUserId,
        identity.name,
        '',
        identity.name,
        now,
        now,
        row.id,
      )
      .run();
    row = {
      ...row,
      platform_user_id: identity.platformUserId,
      last_seen_at: now,
    };
    if (identity.name) row.name = identity.name;
  }

  return row ? mapWorkspaceUser(row) : null;
}

async function getPasswordSessionUser(
  request: Request,
  environment: ApiEnvironment & { DB: D1Database },
) {
  const token = readCookie(request, SESSION_COOKIE_NAME);
  if (!token) return null;
  const now = new Date().toISOString();
  const tokenHash = await hashApiKey(token);
  const row = await environment.DB.prepare(
    `SELECT u.id, u.platform_user_id, u.email, u.name, u.role, u.active,
      u.created_at, u.updated_at, u.last_seen_at
     FROM auth_sessions s
     INNER JOIN workspace_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
  )
    .bind(tokenHash, now)
    .first<WorkspaceUserRow>();
  if (!row) return null;
  await environment.DB.batch([
    environment.DB.prepare(
      'UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?',
    ).bind(now, tokenHash),
    environment.DB.prepare(
      'UPDATE workspace_users SET last_seen_at = ? WHERE id = ?',
    ).bind(now, row.id),
  ]);
  return mapWorkspaceUser({ ...row, last_seen_at: now });
}

export async function getRequestWorkspaceAuth(
  request: Request,
  environment: ApiEnvironment & { DB: D1Database },
): Promise<WorkspaceAuth | null> {
  if (getAuthenticatedIdentity(request)) {
    const user = await getCurrentWorkspaceUser(request, environment);
    return user ? { user, mode: 'platform' } : null;
  }
  const user = await getPasswordSessionUser(request, environment);
  return user ? { user, mode: 'password' } : null;
}

export async function passwordSetupRequired(db: D1Database) {
  const result = await db
    .prepare(
      'SELECT COUNT(*) AS count FROM workspace_users WHERE password_hash IS NOT NULL',
    )
    .first<{ count: number }>();
  return (result?.count || 0) === 0;
}

function requiredWorkspaceRole(request: Request): WorkspaceRole {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/users') && url.searchParams.get('me') === '1')
    return 'viewer';
  if (url.pathname.endsWith('/users') || url.pathname.endsWith('/api-keys'))
    return 'admin';
  if (request.method === 'GET' || request.method === 'OPTIONS') return 'viewer';
  if (url.pathname.endsWith('/records')) return 'editor';
  return 'admin';
}

function corsHeaders(request: Request, environment: ApiEnvironment) {
  const configuredOrigin = environment.GERIDB_ALLOWED_ORIGIN?.trim() || '*';
  const requestOrigin = request.headers.get('origin');
  const allowedOrigin =
    configuredOrigin === '*' ||
    !requestOrigin ||
    requestOrigin === configuredOrigin
      ? configuredOrigin === '*'
        ? '*'
        : requestOrigin || configuredOrigin
      : '';
  return {
    ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin } : {}),
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

export function apiJson(
  request: Request,
  environment: ApiEnvironment,
  body: unknown,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: corsHeaders(request, environment),
  });
}

export function isSameOriginRequest(request: Request) {
  const requestOrigin = request.headers.get('origin');
  return (
    request.headers.get('sec-fetch-site') === 'same-origin' ||
    Boolean(requestOrigin && requestOrigin === new URL(request.url).origin)
  );
}

export async function hashApiKey(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function requireApiAccess(
  request: Request,
  environment: ApiEnvironment & { DB: D1Database },
  minimumRole?: WorkspaceRole,
) {
  try {
    const authentication = await getRequestWorkspaceAuth(request, environment);
    if (authentication) {
      const { user, mode } = authentication;
      if (!user.active)
        return apiJson(
          request,
          environment,
          { error: 'Dieser Benutzer ist gesperrt.' },
          403,
        );
      if (
        mode === 'password' &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
        !isSameOriginRequest(request)
      )
        return apiJson(
          request,
          environment,
          { error: 'Ungültiger Anfrageursprung.' },
          403,
        );
      if (
        ROLE_RANK[user.role] <
        ROLE_RANK[minimumRole || requiredWorkspaceRole(request)]
      )
        return apiJson(
          request,
          environment,
          { error: 'Für diese Aktion fehlen die erforderlichen Rechte.' },
          403,
        );
      return null;
    }
  } catch (error) {
    if (!String(error).toLowerCase().includes('no such table'))
      return apiJson(
        request,
        environment,
        { error: 'Die Anmeldung konnte nicht geprüft werden.' },
        503,
      );
  }
  const environmentKey = environment.GERIDB_API_KEY?.trim();
  const authorization = request.headers.get('authorization') || '';
  const bearerKey = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (environmentKey && bearerKey === environmentKey) return null;

  try {
    if (bearerKey) {
      const keyHash = await hashApiKey(bearerKey);
      const match = await environment.DB.prepare(
        'SELECT id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL LIMIT 1',
      )
        .bind(keyHash)
        .first<{ id: string }>();
      if (match) {
        await environment.DB.prepare(
          'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
        )
          .bind(new Date().toISOString(), match.id)
          .run();
        return null;
      }
    }
  } catch (error) {
    if (!String(error).toLowerCase().includes('no such table'))
      return new Response(
        JSON.stringify({ error: 'API-Zugang konnte nicht geprüft werden.' }),
        {
          status: 503,
          headers: {
            ...corsHeaders(request, environment),
            'content-type': 'application/json; charset=utf-8',
          },
        },
      );
  }

  return new Response(JSON.stringify({ error: 'Nicht autorisiert.' }), {
    status: 401,
    headers: {
      ...corsHeaders(request, environment),
      'content-type': 'application/json; charset=utf-8',
      'www-authenticate': 'Bearer',
    },
  });
}

export function apiOptions(request: Request, environment: ApiEnvironment) {
  const configuredOrigin = environment.GERIDB_ALLOWED_ORIGIN?.trim();
  const requestOrigin = request.headers.get('origin');
  if (
    configuredOrigin &&
    configuredOrigin !== '*' &&
    requestOrigin !== configuredOrigin
  )
    return apiJson(
      request,
      environment,
      { error: 'Origin nicht erlaubt.' },
      403,
    );
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, environment),
  });
}

export type SeedRecord = {
  id: string;
  company: string;
  contact: string;
  email: string;
  status: string;
  value: number;
  date: string;
};

export type SeedTable = {
  id: string;
  baseId: string;
  name: string;
  title: string;
  description: string;
  color: string;
  fields: SeedField[];
  records: SeedRecord[];
};

export const SEED_TABLES: SeedTable[] = [
  {
    id: 'tbl_customers',
    baseId: 'base_crm',
    name: 'CRM & Kontakte',
    title: 'Kunden',
    description: 'Zentrale Kunden- und Vertriebsdaten',
    color: 'cobalt',
    fields: [
      {
        id: 'fld_company',
        key: 'company',
        name: 'Firma',
        type: 'text',
        width: 210,
      },
      {
        id: 'fld_contact',
        key: 'contact',
        name: 'Ansprechperson',
        type: 'text',
        width: 170,
      },
      {
        id: 'fld_email',
        key: 'email',
        name: 'E-Mail',
        type: 'email',
        width: 210,
      },
      {
        id: 'fld_status',
        key: 'status',
        name: 'Status',
        type: 'single-select',
        width: 130,
      },
      {
        id: 'fld_value',
        key: 'value',
        name: 'Volumen',
        type: 'currency',
        width: 125,
      },
      {
        id: 'fld_date',
        key: 'date',
        name: 'Nächster Termin',
        type: 'date',
        width: 160,
      },
      {
        id: 'fld_phone',
        key: 'phone',
        name: 'Telefonnummer',
        type: 'phone',
        width: 170,
      },
      {
        id: 'fld_notes',
        key: 'notes',
        name: 'Gesprächsnotiz',
        type: 'text',
        width: 260,
      },
    ],
    records: [
      {
        id: 'CRM-1042',
        company: 'Alpenwerk GmbH',
        contact: 'Mara Leitner',
        email: 'mara@alpenwerk.at',
        status: 'Aktiv',
        value: 24800,
        date: '2026-09-08',
      },
      {
        id: 'CRM-1041',
        company: 'Nordlicht Studio',
        contact: 'David Kern',
        email: 'david@nordlicht.io',
        status: 'Angebot',
        value: 12400,
        date: '2026-09-12',
      },
      {
        id: 'CRM-1040',
        company: 'Wiener Kollektiv',
        contact: 'Laura Weiß',
        email: 'laura@wiener-kollektiv.at',
        status: 'Kontakt',
        value: 8950,
        date: '2026-09-18',
      },
      {
        id: 'CRM-1039',
        company: 'Berg & Tal OG',
        contact: 'Simon Auer',
        email: 'simon@bergundtal.at',
        status: 'Aktiv',
        value: 31200,
        date: '2026-09-22',
      },
      {
        id: 'CRM-1038',
        company: 'Pixelgarten',
        contact: 'Nina Berger',
        email: 'nina@pixelgarten.dev',
        status: 'Pausiert',
        value: 6700,
        date: '2026-10-01',
      },
      {
        id: 'CRM-1037',
        company: 'Studio Donau',
        contact: 'Emil Graf',
        email: 'emil@studiodonau.at',
        status: 'Angebot',
        value: 16800,
        date: '2026-10-05',
      },
    ],
  },
  {
    id: 'tbl_projects',
    baseId: 'base_projects',
    name: 'Projekte',
    title: 'Projekte',
    description: 'Projektplanung, Budgets und Deadlines',
    color: 'violet',
    fields: [
      {
        id: 'fld_projects_company',
        key: 'company',
        name: 'Projekt',
        type: 'text',
        width: 220,
      },
      {
        id: 'fld_projects_contact',
        key: 'contact',
        name: 'Verantwortlich',
        type: 'text',
        width: 170,
      },
      {
        id: 'fld_projects_email',
        key: 'email',
        name: 'Kunde',
        type: 'text',
        width: 190,
      },
      {
        id: 'fld_projects_status',
        key: 'status',
        name: 'Phase',
        type: 'single-select',
        width: 130,
      },
      {
        id: 'fld_projects_value',
        key: 'value',
        name: 'Budget',
        type: 'currency',
        width: 125,
      },
      {
        id: 'fld_projects_date',
        key: 'date',
        name: 'Deadline',
        type: 'date',
        width: 150,
      },
    ],
    records: [
      {
        id: 'PRJ-204',
        company: 'Website Relaunch',
        contact: 'Lena Hoffmann',
        email: 'Nordlicht Studio',
        status: 'Aktiv',
        value: 18000,
        date: '2026-10-18',
      },
      {
        id: 'PRJ-203',
        company: 'Herbstkampagne',
        contact: 'Mara Leitner',
        email: 'Alpenwerk GmbH',
        status: 'Angebot',
        value: 9200,
        date: '2026-09-30',
      },
      {
        id: 'PRJ-202',
        company: 'CRM Migration',
        contact: 'Simon Auer',
        email: 'Berg & Tal OG',
        status: 'Kontakt',
        value: 14500,
        date: '2026-11-12',
      },
    ],
  },
  {
    id: 'tbl_content',
    baseId: 'base_content',
    name: 'Content Plan',
    title: 'Content Plan',
    description: 'Redaktionsplan für alle Kanäle',
    color: 'amber',
    fields: [
      {
        id: 'fld_content_company',
        key: 'company',
        name: 'Titel',
        type: 'text',
        width: 240,
      },
      {
        id: 'fld_content_contact',
        key: 'contact',
        name: 'Autor',
        type: 'text',
        width: 160,
      },
      {
        id: 'fld_content_email',
        key: 'email',
        name: 'Kanal',
        type: 'text',
        width: 160,
      },
      {
        id: 'fld_content_status',
        key: 'status',
        name: 'Status',
        type: 'single-select',
        width: 130,
      },
      {
        id: 'fld_content_value',
        key: 'value',
        name: 'Reichweite',
        type: 'number',
        width: 125,
      },
      {
        id: 'fld_content_date',
        key: 'date',
        name: 'Veröffentlichung',
        type: 'date',
        width: 170,
      },
    ],
    records: [
      {
        id: 'CNT-302',
        company: 'Behind the Scenes',
        contact: 'Nina Berger',
        email: 'Instagram',
        status: 'Aktiv',
        value: 4200,
        date: '2026-09-10',
      },
      {
        id: 'CNT-301',
        company: 'n8n-Automationen im Alltag',
        contact: 'Emil Graf',
        email: 'LinkedIn',
        status: 'Angebot',
        value: 7600,
        date: '2026-09-15',
      },
      {
        id: 'CNT-300',
        company: 'Kundenstory Alpenwerk',
        contact: 'Laura Weiß',
        email: 'Blog',
        status: 'Kontakt',
        value: 2800,
        date: '2026-09-22',
      },
    ],
  },
];

const SEEDED_FIELD_KEYS = new Map(
  SEED_TABLES.flatMap((table) =>
    table.fields.map((field) => [field.id, field.key] as const),
  ),
);

/**
 * Resolve the stable JSON property used for a field in record values.
 *
 * Older installations stored the initial fields without a key in their
 * settings. Using the current column position as a fallback is unsafe after a
 * field is moved or deleted, so seed fields are resolved by their stable ID.
 */
export function resolveFieldKey(
  settings: string,
  field: { id: string; name: string; position: number },
) {
  try {
    const parsed = JSON.parse(settings) as { key?: unknown };
    if (typeof parsed.key === 'string' && parsed.key.trim()) {
      return parsed.key.trim();
    }
  } catch {
    // Legacy settings were not always valid JSON.
  }

  const seededKey = SEEDED_FIELD_KEYS.get(field.id);
  if (seededKey) return seededKey;

  const stableId = field.id
    .replace(/^fld_/, '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  return `custom_${stableId || field.position}`;
}

const AUTOMATIONS = [
  [
    'auto-1',
    'Neue Anfrage qualifizieren',
    'Neuer Datensatz',
    'Status auf Kontakt setzen',
    1,
    48,
    'vor 12 Min.',
  ],
  [
    'auto-2',
    'Angebot nachfassen',
    'Termin erreicht',
    'E-Mail versenden',
    1,
    16,
    'vor 2 Std.',
  ],
  [
    'auto-3',
    'CRM an Webhook melden',
    'Status ist Aktiv',
    'Webhook aufrufen',
    1,
    92,
    'gestern',
  ],
] as const;

export async function ensureSeed(db: D1Database) {
  const completed = await db
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .bind('initial_seed_v1')
    .first<{ value: string }>();
  if (completed) return;

  const now = new Date().toISOString();
  const setup = SEED_TABLES.flatMap((table) => [
    db
      .prepare(
        'INSERT OR IGNORE INTO bases (id, name, created_at) VALUES (?, ?, ?)',
      )
      .bind(table.baseId, table.name, now),
    db
      .prepare(
        'INSERT OR IGNORE INTO data_tables (id, base_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(table.id, table.baseId, table.title, table.description, now),
    ...table.fields.map((field, position) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO fields (id, table_id, name, type, position, settings, hidden) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          field.id,
          table.id,
          field.name,
          field.type,
          position,
          JSON.stringify({ key: field.key, width: field.width }),
          0,
        ),
    ),
  ]);
  setup.push(
    ...AUTOMATIONS.map(([id, name, trigger, action, enabled, runs, lastRun]) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO automations (id, table_id, name, trigger_type, action_type, enabled, runs, last_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          'tbl_customers',
          name,
          trigger,
          action,
          enabled,
          runs,
          lastRun,
        ),
    ),
  );
  await db.batch(setup);

  for (const table of SEED_TABLES) {
    const count = await db
      .prepare('SELECT COUNT(*) AS count FROM records WHERE table_id = ?')
      .bind(table.id)
      .first<{ count: number }>();
    if (!count?.count) {
      await db.batch(
        table.records.map((record) =>
          db
            .prepare(
              'INSERT OR IGNORE INTO records (id, table_id, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            )
            .bind(record.id, table.id, JSON.stringify(record), now, now),
        ),
      );
    }
  }

  await db
    .prepare('INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)')
    .bind('initial_seed_v1', now)
    .run();
}

export async function resolveTableId(db: D1Database, request: Request) {
  await ensureSeed(db);
  const requested =
    new URL(request.url).searchParams.get('table') || 'tbl_customers';
  const table = await db
    .prepare('SELECT id FROM data_tables WHERE id = ?')
    .bind(requested)
    .first<{ id: string }>();
  if (!table) throw new Error('Tabelle nicht gefunden.');
  return table.id;
}

export function toText(value: unknown) {
  return typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : '';
}

export function cleanRecord(value: unknown) {
  if (!value || typeof value !== 'object')
    throw new Error('Ungültiger Datensatz.');
  const input = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(input)
      .filter(
        ([key, entry]) =>
          key !== 'id' &&
          ['string', 'number', 'boolean'].includes(typeof entry),
      )
      .map(([key, entry]) => [
        key,
        typeof entry === 'string' ? entry.slice(0, 1000) : entry,
      ]),
  );
}
