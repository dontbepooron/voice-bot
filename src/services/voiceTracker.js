'use strict';

const db = require('./database');

/**
 * Service de suivi d'activité vocale.
 * Enregistre les sessions vocales des utilisateurs.
 */

// État en mémoire des sessions actives
const activeSessions = new Map(); // `${guildId}:${userId}` → { channelId, joinedAt }

/**
 * Initialise la table de suivi si elle n'existe pas.
 */
function initVoiceTracking() {
    db.getDb().exec(`
    CREATE TABLE IF NOT EXISTS voice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      userId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      channelName TEXT,
      joinedAt INTEGER NOT NULL,
      leftAt INTEGER,
      duration INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild ON voice_sessions(guildId, userId);
    CREATE INDEX IF NOT EXISTS idx_voice_sessions_time ON voice_sessions(guildId, joinedAt);
  `);
}

/**
 * Enregistre l'entrée d'un utilisateur dans un salon vocal.
 */
function trackJoin(guildId, userId, channelId, channelName) {
    const key = `${guildId}:${userId}`;
    activeSessions.set(key, {
        channelId,
        channelName,
        joinedAt: Date.now(),
    });
}

/**
 * Enregistre la sortie d'un utilisateur et persiste en DB.
 */
function trackLeave(guildId, userId) {
    const key = `${guildId}:${userId}`;
    const session = activeSessions.get(key);
    if (!session) return;

    const leftAt = Date.now();
    const duration = leftAt - session.joinedAt;

    db.run(
        `INSERT INTO voice_sessions (guildId, userId, channelId, channelName, joinedAt, leftAt, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
        guildId, userId, session.channelId, session.channelName || '', session.joinedAt, leftAt, duration
    );

    activeSessions.delete(key);
}

/**
 * Retourne le classement d'activité vocale (top utilisateurs).
 * @param {string} guildId
 * @param {number} [limit=10]
 * @param {number} [sinceMs] - Depuis quand (timestamp ms)
 * @returns {Array<{ userId: string, totalDuration: number, sessionCount: number }>}
 */
function getLeaderboard(guildId, limit = 10, sinceMs = 0) {
    const since = sinceMs || (Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours par défaut
    return db.all(
        `SELECT userId, SUM(duration) as totalDuration, COUNT(*) as sessionCount
     FROM voice_sessions
     WHERE guildId = ? AND joinedAt >= ?
     GROUP BY userId
     ORDER BY totalDuration DESC
     LIMIT ?`,
        guildId, since, limit
    );
}

/**
 * Retourne l'historique vocal d'un utilisateur.
 * @param {string} guildId
 * @param {string} userId
 * @param {number} [limit=10]
 * @returns {Array}
 */
function getUserHistory(guildId, userId, limit = 10) {
    return db.all(
        `SELECT channelName, joinedAt, leftAt, duration
     FROM voice_sessions
     WHERE guildId = ? AND userId = ?
     ORDER BY joinedAt DESC
     LIMIT ?`,
        guildId, userId, limit
    );
}

/**
 * Retourne la durée totale en vocal pour un utilisateur (cette semaine).
 */
function getUserTotalTime(guildId, userId) {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const row = db.get(
        `SELECT SUM(duration) as total FROM voice_sessions
     WHERE guildId = ? AND userId = ? AND joinedAt >= ?`,
        guildId, userId, since
    );
    return row?.total || 0;
}

module.exports = {
    initVoiceTracking,
    trackJoin,
    trackLeave,
    getLeaderboard,
    getUserHistory,
    getUserTotalTime,
    activeSessions,
};
