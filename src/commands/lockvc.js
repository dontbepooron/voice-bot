'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'lockvc',
    aliases: [],
    description: 'Verrouiller un salon vocal (empêcher de rejoindre).',
    usage: '=lockvc [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        let channel;
        if (args[0]) {
            channel = resolveChannel(message.guild, args[0]);
        } else {
            channel = message.member?.voice?.channel;
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({
                embeds: [errorEmbed('Salon vocal introuvable. Utilisation : `=lockvc [#salon]`')],
            });
        }

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                Connect: false,
            });

            await message.reply({
                embeds: [successEmbed(`Salon **${channel.name}** verrouillé. 🔒`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'LOCK_VC', {
                channelId: channel.id,
                channelName: channel.name,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible de verrouiller : ${err.message}`)],
            });
        }
    },
};
