'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'permit',
    aliases: ['allow', 'vcallow'],
    description: "Autoriser un rôle ou un utilisateur à accéder à un salon vocal verrouillé.",
    usage: '=permit @role|@user [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=permit @role|@user [#salon]`')] });
        }

        // Résoudre le rôle ou l'utilisateur
        const targetInput = args[0];
        const roleMatch = targetInput.match(/^<@&(\d+)>$/) || targetInput.match(/^(\d{17,20})$/);
        const userMatch = targetInput.match(/^<@!?(\d+)>$/);

        let target, targetLabel;
        if (roleMatch) {
            target = message.guild.roles.cache.get(roleMatch[1]);
            targetLabel = target ? `@${target.name}` : roleMatch[1];
        } else if (userMatch) {
            target = await message.guild.members.fetch(userMatch[1]).catch(() => null);
            targetLabel = target ? `<@${target.id}>` : userMatch[1];
        }

        if (!target) {
            return message.reply({ embeds: [errorEmbed('Rôle ou utilisateur introuvable.')] });
        }

        let channel = args[1] ? resolveChannel(message.guild, args[1]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        try {
            await channel.permissionOverwrites.edit(target, {
                Connect: true,
                ViewChannel: true,
            });

            await message.reply({
                embeds: [successEmbed(`${targetLabel} peut désormais accéder à **${channel.name}**. ✅`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'PERMIT', {
                targetId: target.id, channelId: channel.id,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible d'autoriser : ${err.message}`)] });
        }
    },
};
