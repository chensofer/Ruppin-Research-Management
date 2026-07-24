const TTL = 5 * 60 * 1000; // 5 דקות

let _data = null;
let _ts   = 0;

export function setCachedProjectData(data) {
  _data = data;
  _ts   = Date.now();
}

export function getCachedProjectData() {
  if (!_data || Date.now() - _ts > TTL) return null;
  return _data;
}

export function invalidateProjectCache() {
  _data = null;
  _ts   = 0;
}
