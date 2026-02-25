'use strict';

const { PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'undeaf',
    aliases: [],
    description: 'Retirer le server-deafen d\'un membre.',
    usage: '=undeaf @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.DeafenMembers]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=undeaf @user`')] });
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

        if (!member.voice.serverDeaf) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas sourd (deafen).`)],
            });
        }

        try {
            await member.voice.setDeaf(false);
            await message.reply({
                embeds: [successEmbed(`<@${member.id}> n'est plus sourd (undeafen). 🔊`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'UNDEAF', {
                targetId: member.id,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible d'undeafen : ${err.message}`)],
            });
        }
    },
};
