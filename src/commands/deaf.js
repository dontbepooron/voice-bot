'use strict';

const { PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');
const config = require('../../config.json');

module.exports = {
    name: 'deaf',
    aliases: [],
    description: 'Server-deafen un membre connecté au vocal.',
    usage: '=deaf @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.DeafenMembers]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=deaf @user`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        if (member.id === config.supremeOwnerId) {
            return message.reply({
                embeds: [errorEmbed('Impossible de deafen le Supreme Owner.')],
            });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        if (member.voice.serverDeaf) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> est déjà sourd (deafen).`)],
            });
        }

        try {
            await member.voice.setDeaf(true);
            await message.reply({
                embeds: [successEmbed(`<@${member.id}> a été rendu sourd (deafen). 🔇`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'DEAF', {
                targetId: member.id,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible de deafen : ${err.message}`)],
            });
        }
    },
};
