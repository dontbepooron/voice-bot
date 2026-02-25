'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'massmute',
    aliases: ['muteall'],
    description: 'Server-mute tous les membres d\'un salon vocal.',
    usage: '=massmute [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.MuteMembers]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel = args[0] ? resolveChannel(message.guild, args[0]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable. Utilisation : `=massmute [#salon]`')] });
        }

        const members = [...channel.members.values()].filter(m => !m.voice.serverMute && m.id !== message.client.user.id);
        if (members.length === 0) {
            return message.reply({ embeds: [errorEmbed('Aucun membre à mute dans ce salon.')] });
        }

        let muted = 0, failed = 0;
        for (const member of members) {
            try {
                await member.voice.setMute(true);
                muted++;
            } catch { failed++; }
            if (members.length > 5) await sleep(200);
        }

        await message.reply({
            embeds: [
                successEmbed(`Mass mute terminé sur **${channel.name}**.`)
                    .addFields(
                        { name: 'Mutés', value: `${muted}`, inline: true },
                        { name: 'Échecs', value: `${failed}`, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'MASS_MUTE', {
            channelId: channel.id, muted, failed,
        });
    },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
