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
) {
  if (isSameOriginRequest(request)) return null;
  const environmentKey = environment.GERIDB_API_KEY?.trim();
  const authorization = request.headers.get('authorization') || '';
  const bearerKey = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (environmentKey && bearerKey === environmentKey) return null;

  let hasDatabaseKey = false;
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
    hasDatabaseKey = Boolean(
      await environment.DB.prepare(
        'SELECT id FROM api_keys WHERE revoked_at IS NULL LIMIT 1',
      ).first<{ id: string }>(),
    );
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

  if (!environmentKey && !hasDatabaseKey) return null;
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
