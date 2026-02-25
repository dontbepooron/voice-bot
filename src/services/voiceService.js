'use strict';

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { PermissionsBitField, ChannelType } = require('discord.js');
const { checkChannelPermissions } = require('../utils/permissions');

/**
 * Trouve le salon vocal où se trouve un utilisateur.
 * @param {import('discord.js').Guild} guild
 * @param {string} userId
 * @returns {import('discord.js').VoiceChannel|null}
 */
function findUserVoice(guild, userId) {
    const member = guild.members.cache.get(userId);
    if (!member) return null;
    return member.voice?.channel || null;
}

/**
 * Déplace un membre vers un salon vocal cible.
 * Fonction centralisée réutilisée par move, swap, massmove, force-move.
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').VoiceChannel} targetChannel
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
async function performMove(member, targetChannel) {
    // Vérifier que le membre est en vocal
    if (!member.voice?.channel) {
        return { success: false, reason: `<@${member.id}> n'est pas connecté à un salon vocal.` };
    }

    // Vérifier les permissions du bot sur le salon cible
    const permCheck = checkChannelPermissions(targetChannel, [
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.MoveMembers,
    ]);
    if (!permCheck.ok) {
        return {
            success: false,
            reason: `Permissions manquantes sur ${targetChannel.name} : ${permCheck.missing.join(', ')}`,
        };
    }

    // Vérifier la limite d'utilisateurs
    if (
        targetChannel.userLimit > 0 &&
        targetChannel.members.size >= targetChannel.userLimit
    ) {
        return { success: false, reason: `Le salon ${targetChannel.name} est plein.` };
    }

    try {
        await member.voice.setChannel(targetChannel);
        return { success: true };
    } catch (err) {
        return { success: false, reason: `Échec du déplacement : ${err.message}` };
    }
}

/**
 * Échange les salons vocaux de deux membres (atomique).
 * @param {import('discord.js').GuildMember} memberA
 * @param {import('discord.js').GuildMember} memberB
 * @returns {Promise<{ success: boolean, reason?: string }>}
 */
async function performSwap(memberA, memberB) {
    const channelA = memberA.voice?.channel;
    const channelB = memberB.voice?.channel;

    if (!channelA) {
        return { success: false, reason: `<@${memberA.id}> n'est pas connecté à un salon vocal.` };
    }
    if (!channelB) {
        return { success: false, reason: `<@${memberB.id}> n'est pas connecté à un salon vocal.` };
    }

    if (channelA.id === channelB.id) {
        return { success: false, reason: 'Les deux utilisateurs sont déjà dans le même salon.' };
    }

    // Déplacer A vers B, puis B vers l'ancien salon de A
    const moveA = await performMove(memberA, channelB);
    if (!moveA.success) {
        return { success: false, reason: `Échec échange (A→B) : ${moveA.reason}` };
    }

    const moveB = await performMove(memberB, channelA);
    if (!moveB.success) {
        // Rollback : remettre A à sa place
        try {
            await memberA.voice.setChannel(channelA);
        } catch { /* best effort rollback */ }
        return { success: false, reason: `Échec échange (B→A) : ${moveB.reason}` };
    }

    return { success: true };
}

/**
 * Déplace tous les membres d'un salon vers un autre avec rate-limiting.
 * @param {import('discord.js').VoiceChannel} fromChannel
 * @param {import('discord.js').VoiceChannel} toChannel
 * @returns {Promise<{ moved: number, failed: number, errors: string[] }>}
 */
async function performMassMove(fromChannel, toChannel) {
    const members = [...fromChannel.members.values()];
    let moved = 0;
    let failed = 0;
    const errors = [];

    for (const member of members) {
        const result = await performMove(member, toChannel);
        if (result.success) {
            moved++;
        } else {
            failed++;
            errors.push(`<@${member.id}> : ${result.reason}`);
        }
        // Throttle pour éviter le rate-limit Discord
        if (members.length > 5) {
            await sleep(300);
        }
    }

    return { moved, failed, errors };
}

/**
 * Fait rejoindre le bot à un salon vocal.
 * @param {import('discord.js').VoiceChannel} channel
 * @returns {{ success: boolean, reason?: string, connection?: any }}
 */
function botJoinChannel(channel) {
    const permCheck = checkChannelPermissions(channel, [
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
    ]);
    if (!permCheck.ok) {
        return {
            success: false,
            reason: `Permissions manquantes : ${permCheck.missing.join(', ')}`,
        };
    }

    if (
        channel.userLimit > 0 &&
        channel.members.size >= channel.userLimit
    ) {
        return { success: false, reason: `Le salon ${channel.name} est plein.` };
    }

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        return { success: true, connection };
    } catch (err) {
        return { success: false, reason: `Impossible de rejoindre : ${err.message}` };
    }
}

/**
 * Fait quitter le bot du salon vocal de la guilde.
 * @param {import('discord.js').Guild} guild
 * @returns {{ success: boolean, reason?: string }}
 */
function botLeaveChannel(guild) {
    const connection = getVoiceConnection(guild.id);
    if (!connection) {
        return { success: false, reason: "Le bot n'est pas connecté à un salon vocal." };
    }

    connection.destroy();
    return { success: true };
}

/**
 * Helper sleep pour le throttle.
 * @param {number} ms
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    findUserVoice,
    performMove,
    performSwap,
    performMassMove,
    botJoinChannel,
    botLeaveChannel,
};
