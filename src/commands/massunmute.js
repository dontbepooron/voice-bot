'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'massunmute',
    aliases: ['unmuteall'],
    description: 'Retirer le server-mute de tous les membres d\'un salon vocal.',
    usage: '=massunmute [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.MuteMembers]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel = args[0] ? resolveChannel(message.guild, args[0]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        const members = [...channel.members.values()].filter(m => m.voice.serverMute);
        if (members.length === 0) {
            return message.reply({ embeds: [errorEmbed('Aucun membre muté dans ce salon.')] });
        }

        let unmuted = 0, failed = 0;
        for (const member of members) {
            try {
                await member.voice.setMute(false);
                unmuted++;
            } catch { failed++; }
            if (members.length > 5) await sleep(200);
        }

        await message.reply({
            embeds: [
                successEmbed(`Mass unmute terminé sur **${channel.name}**.`)
                    .addFields(
                        { name: 'Unmutés', value: `${unmuted}`, inline: true },
                        { name: 'Échecs', value: `${failed}`, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'MASS_UNMUTE', {
            channelId: channel.id, unmuted, failed,
        });
    },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
