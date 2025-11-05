// Utilidad simple de caché basada en localStorage con TTL

type CacheEntry<T> = {
  value: T;
  expiresAt: number; // epoch ms
};

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  try {
    const entry: CacheEntry<T> = { value, expiresAt: Date.now() + ttlMs };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (_) {
    // Ignorar errores de almacenamiento (cuotas, modo privado, etc.)
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.expiresAt !== 'number') return null;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value as T;
  } catch (_) {
    return null;
  }
}

export function deleteCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (_) {
    // noop
  }
}


