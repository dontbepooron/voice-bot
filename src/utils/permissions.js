'use strict';

const { PermissionsBitField } = require('discord.js');

/**
 * Vérifie que le bot possède les permissions requises dans la guilde.
 * @param {import('discord.js').Guild} guild
 * @param {bigint[]} perms - Array de PermissionsBitField flags
 * @returns {{ ok: boolean, missing: string[] }}
 */
function checkBotPermissions(guild, perms) {
    const me = guild.members.me;
    if (!me) return { ok: false, missing: ['Bot non trouvé dans la guilde'] };

    const missing = [];
    for (const perm of perms) {
        if (!me.permissions.has(perm)) {
            const flag = new PermissionsBitField(perm);
            missing.push(flag.toArray().join(', '));
        }
    }

    return { ok: missing.length === 0, missing };
}

/**
 * Vérifie que le bot possède les permissions requises dans un salon spécifique.
 * @param {import('discord.js').GuildChannel} channel
 * @param {bigint[]} perms
 * @returns {{ ok: boolean, missing: string[] }}
 */
function checkChannelPermissions(channel, perms) {
    const me = channel.guild.members.me;
    if (!me) return { ok: false, missing: ['Bot non trouvé dans la guilde'] };

    const channelPerms = channel.permissionsFor(me);
    if (!channelPerms) return { ok: false, missing: ['Impossible de lire les permissions'] };

    const missing = [];
    for (const perm of perms) {
        if (!channelPerms.has(perm)) {
            const flag = new PermissionsBitField(perm);
            missing.push(flag.toArray().join(', '));
        }
    }

    return { ok: missing.length === 0, missing };
}

module.exports = { checkBotPermissions, checkChannelPermissions };
