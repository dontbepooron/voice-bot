'use strict';

const db = require('./database');
const { auditEmbed } = require('../utils/embed');
const config = require('../../config.json');

/**
 * Enregistre une action dans la table audit_logs.
 * @param {string} guildId
 * @param {string} actorId
 * @param {string} action
 * @param {object} [payload={}]
 */
function logAction(guildId, actorId, action, payload = {}) {
    db.run(
        'INSERT INTO audit_logs (guildId, actorId, action, payload, timestamp) VALUES (?, ?, ?, ?, ?)',
        guildId,
        actorId,
        action,
        JSON.stringify(payload),
        Date.now()
    );
}

/**
 * Envoie un embed d'audit dans le salon de logging de la guilde.
 * @param {import('discord.js').Guild} guild
 * @param {string} action
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields
 */
async function sendAuditEmbed(guild, action, fields) {
    // Vérifier la config de la guilde en base
    const guildConf = db.get('SELECT loggingChannelId FROM guild_config WHERE guildId = ?', guild.id);
    const loggingId = guildConf?.loggingChannelId || config.loggingChannelId;

    if (!loggingId) return;

    try {
        const channel = guild.channels.cache.get(loggingId);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [auditEmbed(action, fields)] });
        }
    } catch (err) {
        console.error(`[Audit] Impossible d'envoyer l'embed d'audit :`, err.message);
    }
}

/**
 * Enregistre l'action en DB et envoie un embed d'audit si configuré.
 * @param {import('discord.js').Guild} guild
 * @param {string} actorId
 * @param {string} action
 * @param {object} payload
 * @param {Array<{name: string, value: string, inline?: boolean}>} [embedFields]
 */
async function auditAndNotify(guild, actorId, action, payload = {}, embedFields = null) {
    logAction(guild.id, actorId, action, payload);

    const fields = embedFields || [
        { name: 'Acteur', value: `<@${actorId}>`, inline: true },
        { name: 'Action', value: action, inline: true },
        { name: 'Détails', value: JSON.stringify(payload).substring(0, 1024), inline: false },
    ];

    await sendAuditEmbed(guild, action, fields);
}

module.exports = { logAction, sendAuditEmbed, auditAndNotify };
