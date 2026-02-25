'use strict';

/**
 * Résout un utilisateur à partir d'une mention ou d'un ID brut.
 * @param {import('discord.js').Guild} guild
 * @param {string} input - Mention (<@!ID> ou <@ID>) ou ID brut
 * @returns {Promise<import('discord.js').GuildMember|null>}
 */
async function resolveUser(guild, input) {
    if (!input) return null;

    // Extraire l'ID depuis la mention
    const match = input.match(/^<@!?(\d+)>$/) || input.match(/^(\d{17,20})$/);
    if (!match) return null;

    const userId = match[1];
    try {
        return await guild.members.fetch(userId);
    } catch {
        return null;
    }
}

/**
 * Extrait l'ID utilisateur depuis une mention ou un ID brut (sans fetch).
 * @param {string} input
 * @returns {string|null}
 */
function extractUserId(input) {
    if (!input) return null;
    const match = input.match(/^<@!?(\d+)>$/) || input.match(/^(\d{17,20})$/);
    return match ? match[1] : null;
}

/**
 * Résout un salon à partir d'une mention ou d'un ID brut.
 * @param {import('discord.js').Guild} guild
 * @param {string} input - Mention (<#ID>) ou ID brut
 * @returns {import('discord.js').GuildChannel|null}
 */
function resolveChannel(guild, input) {
    if (!input) return null;

    const match = input.match(/^<#(\d+)>$/) || input.match(/^(\d{17,20})$/);
    if (!match) return null;

    return guild.channels.cache.get(match[1]) || null;
}

module.exports = { resolveUser, extractUserId, resolveChannel };
