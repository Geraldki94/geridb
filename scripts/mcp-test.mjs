const baseUrl = (
  process.env.GERIDB_BASE_URL || 'http://localhost:3016'
).replace(/\/$/, '');
const apiKey = process.env.GERIDB_API_KEY?.trim();

if (!apiKey) {
  throw new Error('GERIDB_API_KEY ist für den MCP-Test erforderlich.');
}

const headers = {
  accept: 'application/json, text/event-stream',
  authorization: `Bearer ${apiKey}`,
  'content-type': 'application/json',
  'mcp-protocol-version': '2025-03-26',
};

async function callMcp(id, method, params) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`MCP ${method}: ${response.status} ${text}`);
  const dataLines = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6));
  const payload = JSON.parse(dataLines.at(-1) || text);
  if (payload.error) throw new Error(`MCP ${method}: ${payload.error.message}`);
  if (payload.result?.isError)
    throw new Error(`MCP ${method}: ${payload.result.content?.[0]?.text}`);
  return payload.result;
}

let recordId = '';

try {
  const tools = await callMcp(1, 'tools/list', {});
  const expectedTools = [
    'list_tables',
    'get_fields',
    'search_records',
    'get_record',
    'create_record',
    'update_record',
    'delete_record',
  ];
  const available = new Set(tools.tools.map((tool) => tool.name));
  if (!expectedTools.every((name) => available.has(name)))
    throw new Error('Die erwarteten GeriDB-MCP-Werkzeuge fehlen.');

  const tables = await callMcp(2, 'tools/call', {
    name: 'list_tables',
    arguments: {},
  });
  if (
    !tables.structuredContent.tables.some(
      (table) => table.id === 'tbl_customers',
    )
  )
    throw new Error('Die CRM-Tabelle wurde über MCP nicht gefunden.');

  const created = await callMcp(3, 'tools/call', {
    name: 'create_record',
    arguments: {
      table_id: 'tbl_customers',
      values: {
        company: 'MCP Integrationstest',
        contact: 'Automatischer Test',
        status: 'Kontakt',
      },
    },
  });
  recordId = created.structuredContent.record.id;

  const updated = await callMcp(4, 'tools/call', {
    name: 'update_record',
    arguments: {
      table_id: 'tbl_customers',
      record_id: recordId,
      values: { status: 'Aktiv' },
    },
  });
  if (updated.structuredContent.record.status !== 'Aktiv')
    throw new Error('MCP-Aktualisierung wurde nicht gespeichert.');

  const fetched = await callMcp(5, 'tools/call', {
    name: 'get_record',
    arguments: { table_id: 'tbl_customers', record_id: recordId },
  });
  if (fetched.structuredContent.record.id !== recordId)
    throw new Error('MCP-Lesezugriff lieferte den falschen Datensatz.');

  await callMcp(6, 'tools/call', {
    name: 'delete_record',
    arguments: { table_id: 'tbl_customers', record_id: recordId },
  });
  recordId = '';

  console.log(
    'GeriDB MCP test passed: discovery, list, create, update, read and delete.',
  );
} finally {
  if (recordId) {
    await callMcp(99, 'tools/call', {
      name: 'delete_record',
      arguments: { table_id: 'tbl_customers', record_id: recordId },
    }).catch(() => undefined);
  }
}
