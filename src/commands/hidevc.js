'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'hidevc',
    aliases: ['hidechannel'],
    description: 'Cacher un salon vocal pour @everyone.',
    usage: '=hidevc [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel = args[0] ? resolveChannel(message.guild, args[0]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        try {
            await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                ViewChannel: false,
            });

            await message.reply({
                embeds: [successEmbed(`Salon **${channel.name}** masqué pour @everyone. 👻`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'HIDE_VC', {
                channelId: channel.id,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de masquer : ${err.message}`)] });
        }
    },
};
