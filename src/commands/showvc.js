'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'showvc',
    aliases: ['showchannel', 'unhidevc'],
    description: 'Rendre visible un salon vocal pour @everyone.',
    usage: '=showvc [#salon]',

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
                ViewChannel: null,
            });

            await message.reply({
                embeds: [successEmbed(`Salon **${channel.name}** rendu visible. 👁️`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'SHOW_VC', {
                channelId: channel.id,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de rendre visible : ${err.message}`)] });
        }
    },
};
