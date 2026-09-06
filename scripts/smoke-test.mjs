const baseUrl = (
  process.env.GERIDB_BASE_URL || 'http://localhost:3016'
).replace(/\/$/, '');
const apiKey = process.env.GERIDB_API_KEY?.trim();
const headers = {
  'content-type': 'application/json',
  origin: 'http://localhost:5678',
  ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
};

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `${init.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  if (!response.headers.get('access-control-allow-origin')) {
    throw new Error(`${init.method || 'GET'} ${path}: CORS-Header fehlt`);
  }
  return payload;
}

let tableId = '';

try {
  const initial = await request('/api/v1/tables');
  if (!Array.isArray(initial.tables) || initial.tables.length < 3) {
    throw new Error('Die drei Starttabellen wurden nicht geladen.');
  }

  const createdTable = await request('/api/v1/tables', {
    method: 'POST',
    body: JSON.stringify({ name: `Smoke Test ${Date.now()}` }),
  });
  tableId = createdTable.table.id;
  const tableQuery = `table=${encodeURIComponent(tableId)}`;

  const createdField = await request(`/api/v1/fields?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({ label: 'Anrufjahr', type: 'year' }),
  });
  await request(`/api/v1/fields?${tableQuery}`, {
    method: 'PATCH',
    body: JSON.stringify({
      id: createdField.field.id,
      label: 'Anrufzeit',
      type: 'time',
    }),
  });

  const createdRecord = await request(`/api/v1/records?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({
      company: 'Smoke Voicebot',
      phone: '+43 660 0000000',
      notes: 'Automatischer Integrationstest',
      [createdField.field.key]: '14:30',
    }),
  });
  await request(`/api/v1/records?${tableQuery}`, {
    method: 'PATCH',
    body: JSON.stringify({ id: createdRecord.record.id, status: 'Aktiv' }),
  });
  const search = await request(
    `/api/v1/records?${tableQuery}&search=${encodeURIComponent('+43 660 0000000')}`,
  );
  if (search.records?.length !== 1 || search.records[0].status !== 'Aktiv') {
    throw new Error(
      'Datensatzsuche oder Aktualisierung lieferte ein falsches Ergebnis.',
    );
  }

  const createdAutomation = await request(`/api/v1/automations?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Voicebot Webhook',
      trigger: 'Datensatz erstellt',
      action: 'Webhook aufrufen',
    }),
  });
  await request(`/api/v1/automations?${tableQuery}`, {
    method: 'PATCH',
    body: JSON.stringify({
      id: createdAutomation.automation.id,
      enabled: false,
    }),
  });
  await request(
    `/api/v1/automations?${tableQuery}&id=${encodeURIComponent(createdAutomation.automation.id)}`,
    { method: 'DELETE' },
  );
  await request(
    `/api/v1/records?${tableQuery}&id=${encodeURIComponent(createdRecord.record.id)}`,
    { method: 'DELETE' },
  );
  await request(
    `/api/v1/fields?${tableQuery}&id=${encodeURIComponent(createdField.field.id)}`,
    { method: 'DELETE' },
  );
  await request(`/api/v1/tables?id=${encodeURIComponent(tableId)}`, {
    method: 'DELETE',
  });
  tableId = '';

  console.log(
    'GeriDB smoke test passed: tables, fields, records, search, CORS and automations.',
  );
} finally {
  if (tableId) {
    await request(`/api/v1/tables?id=${encodeURIComponent(tableId)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
}
