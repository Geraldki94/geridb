import { env } from 'cloudflare:workers';
import {
  apiJson,
  apiOptions,
  hashApiKey,
  requireApiAccess,
  toText,
} from '@/lib/server/geridb';

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

function createSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const random = btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `geridb_live_${random}`;
}

export function OPTIONS(request: Request) {
  return apiOptions(request, env);
}

export async function GET(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const result = await env.DB.prepare(
      'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 50',
    ).all<ApiKeyRow>();
    return apiJson(request, env, {
      apiKeys: result.results.map((item) => ({
        id: item.id,
        name: item.name,
        prefix: item.key_prefix,
        createdAt: item.created_at,
        lastUsedAt: item.last_used_at,
      })),
      environmentKeyConfigured: Boolean(env.GERIDB_API_KEY?.trim()),
    });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'API-Schlüssel konnten nicht geladen werden.',
      },
      500,
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const name = toText(body.name).trim().slice(0, 80) || 'API-Zugang';
    const secret = createSecret();
    const id = `key_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const prefix = `${secret.slice(0, 18)}••••${secret.slice(-4)}`;
    await env.DB.prepare(
      'INSERT INTO api_keys (id, name, key_hash, key_prefix, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL, NULL)',
    )
      .bind(id, name, await hashApiKey(secret), prefix, createdAt)
      .run();
    return apiJson(
      request,
      env,
      {
        apiKey: { id, name, prefix, createdAt, lastUsedAt: null },
        secret,
      },
      201,
    );
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'API-Schlüssel konnte nicht erstellt werden.',
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireApiAccess(request, env);
  if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Schlüssel-ID ist erforderlich.');
    const result = await env.DB.prepare(
      'UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
    )
      .bind(new Date().toISOString(), id)
      .run();
    if (!result.meta.changes)
      return apiJson(
        request,
        env,
        { error: 'API-Schlüssel nicht gefunden.' },
        404,
      );
    return apiJson(request, env, { revoked: id });
  } catch (error) {
    return apiJson(
      request,
      env,
      {
        error:
          error instanceof Error
            ? error.message
            : 'API-Schlüssel konnte nicht widerrufen werden.',
      },
      400,
    );
  }
}
