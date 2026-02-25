'use strict';

const { PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');
const config = require('../../config.json');

module.exports = {
    name: 'mute',
    aliases: [],
    description: 'Server-mute un membre connecté au vocal.',
    usage: '=mute @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.MuteMembers]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=mute @user`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        // Ne pas muter le supreme owner
        if (member.id === config.supremeOwnerId) {
            return message.reply({
                embeds: [errorEmbed('Impossible de mute le Supreme Owner.')],
            });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        if (member.voice.serverMute) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> est déjà mute.`)],
            });
        }

        try {
            await member.voice.setMute(true);
            await message.reply({
                embeds: [successEmbed(`<@${member.id}> a été mute. 🔇`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'MUTE', {
                targetId: member.id,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible de mute : ${err.message}`)],
            });
        }
    },
};
