'use strict';

const { PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'unmute',
    aliases: [],
    description: 'Retirer le server-mute d\'un membre.',
    usage: '=unmute @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.MuteMembers]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=unmute @user`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        if (!member.voice.serverMute) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas mute.`)],
            });
        }

        try {
            await member.voice.setMute(false);
            await message.reply({
                embeds: [successEmbed(`<@${member.id}> a été unmute. 🔊`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'UNMUTE', {
                targetId: member.id,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible d'unmute : ${err.message}`)],
            });
        }
    },
};
