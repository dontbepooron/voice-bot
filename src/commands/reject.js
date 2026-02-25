'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser, resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'reject',
    aliases: ['block', 'vcblock', 'deny'],
    description: "Bloquer un utilisateur d'un salon vocal spécifique.",
    usage: '=reject @user [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=reject @user [#salon]`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        let channel = args[1] ? resolveChannel(message.guild, args[1]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        try {
            await channel.permissionOverwrites.edit(member, {
                Connect: false,
                ViewChannel: false,
            });

            // Si l'utilisateur est dans le salon, le déconnecter
            if (member.voice?.channel?.id === channel.id) {
                await member.voice.disconnect();
            }

            await message.reply({
                embeds: [successEmbed(`<@${member.id}> est bloqué de **${channel.name}**. 🚫`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'REJECT', {
                targetId: member.id, channelId: channel.id,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de bloquer : ${err.message}`)] });
        }
    },
};
