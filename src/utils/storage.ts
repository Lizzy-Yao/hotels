export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function remove(key: string) {
  localStorage.removeItem(key);
}

export function nowISO() {
  return new Date().toISOString();
}

export function createId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
