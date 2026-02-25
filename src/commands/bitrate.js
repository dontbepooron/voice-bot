'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'bitrate',
    aliases: ['setbitrate'],
    description: "Modifier le bitrate d'un salon vocal.",
    usage: '=bitrate #salon <kbps> | =bitrate <kbps>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel, bitrateKbps;

        const possibleChannel = resolveChannel(message.guild, args[0]);
        if (possibleChannel && possibleChannel.type === ChannelType.GuildVoice) {
            channel = possibleChannel;
            bitrateKbps = parseInt(args[1], 10);
        } else {
            channel = message.member?.voice?.channel;
            bitrateKbps = parseInt(args[0], 10);
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        if (isNaN(bitrateKbps) || bitrateKbps < 8 || bitrateKbps > 384) {
            return message.reply({ embeds: [errorEmbed('Le bitrate doit être entre 8 et 384 kbps.')] });
        }

        try {
            await channel.setBitrate(bitrateKbps * 1000);
            await message.reply({
                embeds: [successEmbed(`Bitrate de **${channel.name}** changé à **${bitrateKbps} kbps**.`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'SET_BITRATE', {
                channelId: channel.id, bitrateKbps,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de changer le bitrate : ${err.message}`)] });
        }
    },
};
