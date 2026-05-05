
interface CacheItem<T> {
  value: T;
  timestamp: number;
  expiry: number;
}

const CACHE_PREFIX = 'metacheck_cache_';
const DEFAULT_TTL_MINUTES = 60 * 24; // 24 horas padrão

export const cacheService = {
  /**
   * Salva um item no cache com tempo de expiração
   */
  set: <T>(key: string, value: T, ttlMinutes: number = DEFAULT_TTL_MINUTES): void => {
    try {
      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        expiry: Date.now() + (ttlMinutes * 60 * 1000),
      };
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn(`[Cache] Erro ao salvar chave ${key}:`, error);
    }
  },

  /**
   * Recupera um item do cache, verificando a validade
   */
  get: <T>(key: string): T | null => {
    try {
      const itemStr = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      // Verifica se expirou
      if (Date.now() > item.expiry) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn(`[Cache] Erro ao ler chave ${key}:`, error);
      return null;
    }
  },

  /**
   * Remove um item específico do cache
   */
  remove: (key: string): void => {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  },

  /**
   * Limpa todo o cache relacionado ao app
   */
  clearAll: (): void => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
