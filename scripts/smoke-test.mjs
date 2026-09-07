const baseUrl = (
  process.env.GERIDB_BASE_URL || 'http://localhost:3016'
).replace(/\/$/, '');
const apiKey = process.env.GERIDB_API_KEY?.trim();
const baseHeaders = {
  'content-type': 'application/json',
  origin: baseUrl,
};
const externalHeaders = { origin: 'http://localhost:5678' };
let activeApiKey = apiKey || '';

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(activeApiKey ? { authorization: `Bearer ${activeApiKey}` } : {}),
      ...init.headers,
    },
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
let standardTableId = '';
let createdApiKeyId = '';

try {
  const initial = await request('/api/v1/tables');
  if (!Array.isArray(initial.tables) || initial.tables.length < 3) {
    throw new Error('Die drei Starttabellen wurden nicht geladen.');
  }

  const standardTable = await request('/api/v1/tables', {
    method: 'POST',
    body: JSON.stringify({ name: `Löschtest ${Date.now()}` }),
  });
  standardTableId = standardTable.table.id;
  const standardQuery = `table=${encodeURIComponent(standardTableId)}`;
  const standardFields = await request(`/api/v1/fields?${standardQuery}`);
  const standardNameField = standardFields.fields?.find(
    (field) => field.key === 'company',
  );
  if (!standardNameField)
    throw new Error('Das Standardfeld für den Löschtest fehlt.');
  await request(
    `/api/v1/fields?${standardQuery}&id=${encodeURIComponent(standardNameField.id)}`,
    { method: 'DELETE' },
  );
  const standardFieldsAfterDelete = await request(
    `/api/v1/fields?${standardQuery}`,
  );
  if (
    standardFieldsAfterDelete.fields?.some(
      (field) => field.id === standardNameField.id,
    )
  )
    throw new Error('Ein Basisfeld wurde nach dem Löschen erneut angelegt.');
  await request(`/api/v1/tables?id=${encodeURIComponent(standardTableId)}`, {
    method: 'DELETE',
  });
  standardTableId = '';

  const createdTable = await request('/api/v1/tables', {
    method: 'POST',
    body: JSON.stringify({ name: `Smoke Test ${Date.now()}`, fromCsv: true }),
  });
  tableId = createdTable.table.id;
  const tableQuery = `table=${encodeURIComponent(tableId)}`;
  await request('/api/v1/tables', {
    method: 'PATCH',
    body: JSON.stringify({
      id: tableId,
      name: 'Smoke Navigation',
      title: 'Smoke Tabelle',
      description: 'Bearbeitbare Datenbank',
    }),
  });
  const renamedTables = await request('/api/v1/tables');
  const renamedTable = renamedTables.tables?.find(
    (table) => table.id === tableId,
  );
  if (
    renamedTable?.name !== 'Smoke Navigation' ||
    renamedTable?.title !== 'Smoke Tabelle' ||
    renamedTable?.description !== 'Bearbeitbare Datenbank'
  )
    throw new Error('Die Datenbank-Metadaten wurden nicht gespeichert.');
  const emptyCsvTableFields = await request(`/api/v1/fields?${tableQuery}`);
  if (emptyCsvTableFields.fields?.length !== 0) {
    throw new Error(
      'Eine CSV-Datenbank wurde nicht ohne Basisfelder angelegt.',
    );
  }

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

  const selectField = await request(`/api/v1/fields?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({
      label: 'Priorität',
      type: 'single-select',
      options: ['Hoch', 'Mittel', 'Niedrig'],
      conditionalRules: [
        {
          id: 'rule_high',
          operator: 'equals',
          value: 'Hoch',
          color: 'red',
        },
      ],
    }),
  });
  await request(`/api/v1/fields?${tableQuery}`, {
    method: 'PATCH',
    body: JSON.stringify({
      id: selectField.field.id,
      options: ['Sofort', 'Diese Woche', 'Später'],
      conditionalRules: [
        {
          id: 'rule_now',
          operator: 'equals',
          value: 'Sofort',
          color: 'amber',
        },
      ],
    }),
  });
  const csvField = await request(`/api/v1/fields?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({ label: 'Kundennummer', type: 'text' }),
  });
  const csvNoteField = await request(`/api/v1/fields?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({ label: 'Freie Notiz', type: 'text' }),
  });

  const importedWithoutName = await request(`/api/v1/records?${tableQuery}`, {
    method: 'POST',
    body: JSON.stringify({
      company: '',
      [csvField.field.key]: 'KD-4711',
      [csvNoteField.field.key]: 'Import ohne Name-Spalte',
      [selectField.field.key]: 'Diese Woche',
    }),
  });
  const importedSearch = await request(
    `/api/v1/records?${tableQuery}&search=${encodeURIComponent('KD-4711')}`,
  );
  if (
    importedSearch.records?.[0]?.id !== importedWithoutName.record.id ||
    importedSearch.records[0][csvNoteField.field.key] !==
      'Import ohne Name-Spalte'
  ) {
    throw new Error(
      'CSV-artige Datensätze ohne Name-Spalte wurden nicht gespeichert.',
    );
  }

  const fieldsAfterOptions = await request(`/api/v1/fields?${tableQuery}`);
  const savedSelectField = fieldsAfterOptions.fields?.find(
    (field) => field.id === selectField.field.id,
  );
  if (
    JSON.stringify(savedSelectField?.options) !==
      JSON.stringify(['Sofort', 'Diese Woche', 'Später']) ||
    savedSelectField?.conditionalRules?.[0]?.color !== 'amber'
  ) {
    throw new Error(
      'Eigene Auswahlmöglichkeiten oder Formatierungsregeln wurden nicht gespeichert.',
    );
  }

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
    body: JSON.stringify({ id: createdRecord.record.id, status: 'Gewonnen' }),
  });
  const search = await request(
    `/api/v1/records?${tableQuery}&search=${encodeURIComponent('+43 660 0000000')}`,
  );
  if (search.records?.length !== 1 || search.records[0].status !== 'Gewonnen') {
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

  const createdApiKey = await request('/api/v1/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke n8n' }),
  });
  createdApiKeyId = createdApiKey.apiKey.id;
  activeApiKey = createdApiKey.secret;
  const unauthorized = await fetch(`${baseUrl}/api/v1/tables`, {
    headers: { ...baseHeaders, ...externalHeaders },
  });
  if (unauthorized.status !== 401)
    throw new Error(
      'Externe API-Anfragen ohne Schlüssel wurden nicht abgewiesen.',
    );
  const keyList = await request('/api/v1/api-keys', {
    headers: externalHeaders,
  });
  if (!keyList.apiKeys?.some((item) => item.id === createdApiKeyId))
    throw new Error('Der erstellte API-Schlüssel wurde nicht aufgelistet.');
  await request(
    `/api/v1/fields?${tableQuery}&id=${encodeURIComponent(createdField.field.id)}`,
    { method: 'DELETE' },
  );
  const recordsAfterFieldDelete = await request(
    `/api/v1/records?${tableQuery}`,
  );
  if (
    recordsAfterFieldDelete.records?.some(
      (record) => createdField.field.key in record,
    )
  )
    throw new Error('Gelöschte Feldwerte sind in Datensätzen verblieben.');
  await request(
    `/api/v1/records?${tableQuery}&id=${encodeURIComponent(createdRecord.record.id)}`,
    { method: 'DELETE' },
  );
  await request(
    `/api/v1/records?${tableQuery}&id=${encodeURIComponent(importedWithoutName.record.id)}`,
    { method: 'DELETE' },
  );
  await request(`/api/v1/tables?id=${encodeURIComponent(tableId)}`, {
    method: 'DELETE',
  });
  tableId = '';
  await request(`/api/v1/api-keys?id=${encodeURIComponent(createdApiKeyId)}`, {
    method: 'DELETE',
  });
  createdApiKeyId = '';
  activeApiKey = apiKey || '';

  console.log(
    'GeriDB smoke test passed: editable databases, deletable fields, CSV, formatting, records, API keys, search, CORS and automations.',
  );
} finally {
  if (createdApiKeyId) {
    await request(
      `/api/v1/api-keys?id=${encodeURIComponent(createdApiKeyId)}`,
      { method: 'DELETE' },
    ).catch(() => undefined);
    activeApiKey = apiKey || '';
  }
  if (tableId) {
    await request(`/api/v1/tables?id=${encodeURIComponent(tableId)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
  if (standardTableId) {
    await request(`/api/v1/tables?id=${encodeURIComponent(standardTableId)}`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }
}
