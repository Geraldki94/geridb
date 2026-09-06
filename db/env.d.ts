declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    GERIDB_API_KEY?: string;
    GERIDB_ALLOWED_ORIGIN?: string;
  }
}
