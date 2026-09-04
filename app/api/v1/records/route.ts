import { env } from 'cloudflare:workers';

const TABLE_ID = 'tbl_customers';

const demoRecords = [
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
];

const defaultFields = [
  ['fld_company', 'Firma', 'text'],
  ['fld_contact', 'Ansprechperson', 'text'],
  ['fld_email', 'E-Mail', 'email'],
  ['fld_status', 'Status', 'single-select'],
  ['fld_value', 'Volumen', 'currency'],
  ['fld_date', 'Nächster Termin', 'date'],
] as const;

async function ensureSeed() {
  const now = new Date().toISOString();
  const setup = [
    env.DB.prepare(
      'INSERT OR IGNORE INTO bases (id, name, created_at) VALUES (?, ?, ?)',
    ).bind('base_crm', 'CRM & Kontakte', now),
    env.DB.prepare(
      'INSERT OR IGNORE INTO data_tables (id, base_id, name, description, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      TABLE_ID,
      'base_crm',
      'Kunden',
      'Zentrale Kunden- und Vertriebsdaten',
      now,
    ),
    ...defaultFields.map(([id, name, type], position) =>
      env.DB.prepare(
        'INSERT OR IGNORE INTO fields (id, table_id, name, type, position, settings, hidden) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(id, TABLE_ID, name, type, position, '{}', 0),
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO automations (id, table_id, name, trigger_type, action_type, enabled, runs, last_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      'auto-1',
      TABLE_ID,
      'Neue Anfrage qualifizieren',
      'Neuer Datensatz',
      'Status auf Kontakt setzen',
      1,
      48,
      'vor 12 Min.',
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO automations (id, table_id, name, trigger_type, action_type, enabled, runs, last_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      'auto-2',
      TABLE_ID,
      'Angebot nachfassen',
      'Termin erreicht',
      'E-Mail versenden',
      1,
      16,
      'vor 2 Std.',
    ),
    env.DB.prepare(
      'INSERT OR IGNORE INTO automations (id, table_id, name, trigger_type, action_type, enabled, runs, last_run) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      'auto-3',
      TABLE_ID,
      'CRM an Webhook melden',
      'Status ist Aktiv',
      'Webhook aufrufen',
      1,
      92,
      'gestern',
    ),
  ];
  await env.DB.batch(setup);
  const count = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM records WHERE table_id = ?',
  )
    .bind(TABLE_ID)
    .first<{ count: number }>();
  if (!count?.count) {
    await env.DB.batch(
      demoRecords.map((record) =>
        env.DB.prepare(
          'INSERT OR IGNORE INTO records (id, table_id, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        ).bind(record.id, TABLE_ID, JSON.stringify(record), now, now),
      ),
    );
  }
}

function toText(value: unknown) {
  return typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : '';
}

function cleanRecord(value: unknown) {
  if (!value || typeof value !== 'object')
    throw new Error('Ungültiger Datensatz.');
  const input = value as Record<string, unknown>;
  const company = toText(input.company).trim();
  if (!company) throw new Error('Firma ist erforderlich.');
  const allowedStatuses = ['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'];
  return {
    company,
    contact: toText(input.contact)
      .trim()
      .slice(0, 160),
    email: toText(input.email)
      .trim()
      .slice(0, 240),
    status: allowedStatuses.includes(toText(input.status))
      ? toText(input.status)
      : 'Kontakt',
    value: Number.isFinite(Number(input.value)) ? Number(input.value) : 0,
    date: toText(input.date).slice(0, 10),
  };
}

export async function GET(request: Request) {
  try {
    await ensureSeed();
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const result = await env.DB.prepare(
      'SELECT id, values_json FROM records WHERE table_id = ? ORDER BY updated_at DESC LIMIT 500',
    )
      .bind(TABLE_ID)
      .all<{ id: string; values_json: string }>();
    const records = result.results
      .map((row) => ({ id: row.id, ...JSON.parse(row.values_json) }))
      .filter(
        (record) =>
          !search || JSON.stringify(record).toLowerCase().includes(search),
      );
    return Response.json({
      records,
      meta: { total: records.length, tableId: TABLE_ID },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : 'Datenbank nicht verfügbar.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeed();
    const values = cleanRecord(await request.json());
    const id = `crm_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO records (id, table_id, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, TABLE_ID, JSON.stringify(values), now, now)
      .run();
    return Response.json({ record: { id, ...values } }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht angelegt werden.',
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = toText(body.id);
    if (!id) throw new Error('ID ist erforderlich.');
    const existing = await env.DB.prepare(
      'SELECT values_json FROM records WHERE id = ? AND table_id = ?',
    )
      .bind(id, TABLE_ID)
      .first<{ values_json: string }>();
    if (!existing)
      return Response.json(
        { error: 'Datensatz nicht gefunden.' },
        { status: 404 },
      );
    const values = cleanRecord({
      ...JSON.parse(existing.values_json),
      ...body,
    });
    await env.DB.prepare(
      'UPDATE records SET values_json = ?, updated_at = ? WHERE id = ? AND table_id = ?',
    )
      .bind(JSON.stringify(values), new Date().toISOString(), id, TABLE_ID)
      .run();
    return Response.json({ record: { id, ...values } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht geändert werden.',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id)
    return Response.json({ error: 'ID ist erforderlich.' }, { status: 400 });
  await env.DB.prepare('DELETE FROM records WHERE id = ? AND table_id = ?')
    .bind(id, TABLE_ID)
    .run();
  return Response.json({ deleted: id });
}
