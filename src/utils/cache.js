'use strict';

/**
 * Cache TTL simple en mémoire.
 * Utilisé pour réduire les accès DB fréquents.
 */
class TtlCache {
    constructor(defaultTtlMs = 5000) {
        this._cache = new Map();
        this._defaultTtl = defaultTtlMs;
    }

    /**
     * Récupère une valeur du cache.
     * @param {string} key
     * @returns {*|undefined}
     */
    get(key) {
        const entry = this._cache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this._cache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    /**
     * Stocke une valeur dans le cache.
     * @param {string} key
     * @param {*} value
     * @param {number} [ttlMs] - Durée de vie en ms (utilise le défaut si omis)
     */
    set(key, value, ttlMs) {
        const ttl = ttlMs ?? this._defaultTtl;
        this._cache.set(key, {
            value,
            expiresAt: Date.now() + ttl,
        });
    }

    /**
     * Invalide une entrée du cache.
     * @param {string} key
     */
    invalidate(key) {
        this._cache.delete(key);
    }

    /**
     * Invalide toutes les entrées dont la clé commence par le préfixe.
     * @param {string} prefix
     */
    invalidatePrefix(prefix) {
        for (const key of this._cache.keys()) {
            if (key.startsWith(prefix)) {
                this._cache.delete(key);
            }
        }
    }

    /** Vide tout le cache. */
    clear() {
        this._cache.clear();
    }
}

module.exports = TtlCache;
