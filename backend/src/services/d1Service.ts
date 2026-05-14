// Simple Cloudflare D1 HTTP helper
// Note: D1 is not a MySQL-compatible endpoint — Sequelize cannot connect directly.
// This helper calls Cloudflare's D1 REST endpoint; keep your API token secret.

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId) {
  // don't throw on import in environments that don't use D1
}

export async function d1Query(sql: string, namedParameters?: Record<string, unknown>) {
  if (!accountId || !dbId || !apiToken) throw new Error('Cloudflare D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN.');

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params: namedParameters ? Object.values(namedParameters) : [] })
  });

  const json: any = await res.json();
  if (!res.ok) {
    const msg = (json && json.errors && json.errors[0] && json.errors[0].message) || `D1 query failed (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  if (json && json.success === false) {
    const msg = (json.errors && json.errors[0] && json.errors[0].message) || 'D1 query failed';
    throw new Error(msg);
  }

  return json;
}

export async function d1SelectAll(table: string) {
  const r = await d1Query(`SELECT * FROM ${table}`);
  return r;
}

export default { d1Query, d1SelectAll };
