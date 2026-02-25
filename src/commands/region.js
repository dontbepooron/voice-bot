'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

const VALID_REGIONS = [
    'brazil', 'hong-kong', 'india', 'japan', 'rotterdam',
    'russia', 'singapore', 'south-africa', 'sydney', 'us-central',
    'us-east', 'us-south', 'us-west', 'europe', 'auto',
];

module.exports = {
    name: 'region',
    aliases: ['rtcregion', 'setregion'],
    description: "Changer la région RTC d'un salon vocal.",
    usage: '=region #salon <region> | =region <region>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel, regionValue;

        const possibleChannel = resolveChannel(message.guild, args[0]);
        if (possibleChannel && possibleChannel.type === ChannelType.GuildVoice) {
            channel = possibleChannel;
            regionValue = args[1]?.toLowerCase();
        } else {
            channel = message.member?.voice?.channel;
            regionValue = args[0]?.toLowerCase();
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        if (!regionValue) {
            return message.reply({
                embeds: [errorEmbed(`Utilisation : \`=region <region>\`\nRégions disponibles : \`${VALID_REGIONS.join('`, `')}\``)],
            });
        }

        const rtcRegion = regionValue === 'auto' ? null : regionValue;

        try {
            await channel.setRTCRegion(rtcRegion);
            await message.reply({
                embeds: [successEmbed(`Région de **${channel.name}** changée à **${regionValue}**.`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'SET_REGION', {
                channelId: channel.id, region: regionValue,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de changer la région : ${err.message}`)] });
        }
    },
};
