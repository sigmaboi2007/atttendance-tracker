// Tiny Upstash/Vercel-KV REST helper (no npm packages needed).
const U = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map(); // fallback if Redis is not connected (weak, per server instance)

async function cmd(c) {
  const r = await fetch(U, { method: "POST", headers: { Authorization: "Bearer " + T }, body: JSON.stringify(c) });
  return (await r.json()).result;
}

// Adds 1 to a counter that expires after 24h; true while it is still within the limit.
async function hit(key, limit) {
  if (U && T) {
    try { const n = await cmd(["INCR", key]); if (n === 1) await cmd(["EXPIRE", key, 86400]); return n <= limit; }
    catch (e) { return false; }
  }
  const n = (mem.get(key) || 0) + 1; mem.set(key, n); return n <= limit;
}

module.exports = { cmd, hit, ready: !!(U && T) };
