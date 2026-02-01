const TTL_MS = 15 * 60 * 1000; // 15 minutes
const _map = new Map();

function store(id, value) {
  _map.set(id, { ...value, _expiresAt: Date.now() + TTL_MS });
}

function get(id) {
  const v = _map.get(id);
  if (!v) return null;
  if (Date.now() > v._expiresAt) {
    _map.delete(id);
    return null;
  }
  return v;
}

function update(id, patch) {
  const v = get(id);
  if (!v) return false;
  _map.set(id, { ...v, ...patch, _expiresAt: Date.now() + TTL_MS });
  return true;
}

function cleanupNow() {
  const now = Date.now();
  for (const [k, v] of _map.entries()) {
    if (now > v._expiresAt) _map.delete(k);
  }
}

setInterval(cleanupNow, 60 * 1000).unref();

module.exports = { store, get, update, cleanupNow };