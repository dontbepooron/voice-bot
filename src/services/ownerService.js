'use strict';

const db = require('./database');
const { logAction } = require('./auditService');
const config = require('../../config.json');
const TtlCache = require('../utils/cache');

const ownerCache = new TtlCache((config.performance?.cacheTtlSeconds || 5) * 1000);

/**
 * Vérifie si un utilisateur est owner (supremeOwnerId prioritaire).
 * @param {string} guildId
 * @param {string} userId
 * @returns {boolean}
 */
function isOwner(guildId, userId) {
    // Le supreme owner a toujours tous les droits
    if (userId === config.supremeOwnerId) return true;

    const cacheKey = `owner:${guildId}:${userId}`;
    const cached = ownerCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const row = db.get(
        'SELECT 1 FROM owners WHERE guildId = ? AND userId = ?',
        guildId,
        userId
    );
    const result = !!row;
    ownerCache.set(cacheKey, result);
    return result;
}

/**
 * Ajoute un owner à la guilde.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} actorId - ID de l'acteur ayant initié l'ajout
 * @returns {{ success: boolean, reason?: string }}
 */
function addOwner(guildId, userId, actorId) {
    // Vérifier doublon
    const existing = db.get(
        'SELECT 1 FROM owners WHERE guildId = ? AND userId = ?',
        guildId,
        userId
    );
    if (existing) {
        return { success: false, reason: 'Cet utilisateur est déjà owner.' };
    }

    // Insertion atomique + audit
    const insertAndLog = db.transaction(() => {
        db.run(
            'INSERT INTO owners (guildId, userId, addedAt) VALUES (?, ?, ?)',
            guildId,
            userId,
            Date.now()
        );
        logAction(guildId, actorId, 'OWNER_ADD', { targetId: userId });
    });

    insertAndLog();
    ownerCache.invalidate(`owner:${guildId}:${userId}`);
    return { success: true };
}

/**
 * Retire un owner de la guilde.
 * @param {string} guildId
 * @param {string} userId
 * @param {string} actorId
 * @returns {{ success: boolean, reason?: string }}
 */
function removeOwner(guildId, userId, actorId) {
    // Impossible de retirer le supreme owner
    if (userId === config.supremeOwnerId) {
        return { success: false, reason: 'Impossible de retirer le Supreme Owner.' };
    }

    // Vérifier existence
    const existing = db.get(
        'SELECT 1 FROM owners WHERE guildId = ? AND userId = ?',
        guildId,
        userId
    );
    if (!existing) {
        return { success: false, reason: "Cet utilisateur n'est pas owner." };
    }

    const deleteAndLog = db.transaction(() => {
        db.run(
            'DELETE FROM owners WHERE guildId = ? AND userId = ?',
            guildId,
            userId
        );
        logAction(guildId, actorId, 'OWNER_REMOVE', { targetId: userId });
    });

    deleteAndLog();
    ownerCache.invalidate(`owner:${guildId}:${userId}`);
    return { success: true };
}

/**
 * Liste tous les owners de la guilde.
 * @param {string} guildId
 * @returns {Array<{ userId: string, addedAt: number }>}
 */
function listOwners(guildId) {
    return db.all(
        'SELECT userId, addedAt FROM owners WHERE guildId = ? ORDER BY addedAt ASC',
        guildId
    );
}

module.exports = { isOwner, addOwner, removeOwner, listOwners };
