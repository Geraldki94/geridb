import { env } from 'cloudflare:workers';

const TABLE_ID = 'tbl_customers';

export async function GET() {
  try {
    const result = await env.DB.prepare(
      'SELECT id, name, trigger_type, action_type, enabled, runs, last_run FROM automations WHERE table_id = ? ORDER BY name',
    )
      .bind(TABLE_ID)
      .all();
    return Response.json({ automations: result.results });
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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; enabled?: boolean };
    if (!body.id || typeof body.enabled !== 'boolean')
      return Response.json(
        { error: 'ID und Status sind erforderlich.' },
        { status: 400 },
      );
    await env.DB.prepare(
      'UPDATE automations SET enabled = ? WHERE id = ? AND table_id = ?',
    )
      .bind(body.enabled ? 1 : 0, body.id, TABLE_ID)
      .run();
    return Response.json({ id: body.id, enabled: body.enabled });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Automation konnte nicht geändert werden.',
      },
      { status: 400 },
    );
  }
}
