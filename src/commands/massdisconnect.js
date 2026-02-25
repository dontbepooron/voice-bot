'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'massdisconnect',
    aliases: ['massdc', 'dcall'],
    description: 'Déconnecter tous les membres d\'un salon vocal.',
    usage: '=massdisconnect [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.MoveMembers]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel = args[0] ? resolveChannel(message.guild, args[0]) : message.member?.voice?.channel;
        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        const members = [...channel.members.values()].filter(m => m.id !== message.client.user.id);
        if (members.length === 0) {
            return message.reply({ embeds: [errorEmbed('Aucun membre à déconnecter.')] });
        }

        const total = members.length;
        let disconnected = 0, failed = 0;

        for (const member of members) {
            try {
                await member.voice.disconnect();
                disconnected++;
            } catch { failed++; }
            if (total > 5) await sleep(250);
        }

        await message.reply({
            embeds: [
                successEmbed(`Mass disconnect terminé sur **${channel.name}**.`)
                    .addFields(
                        { name: 'Déconnectés', value: `${disconnected}`, inline: true },
                        { name: 'Échecs', value: `${failed}`, inline: true },
                        { name: 'Total initial', value: `${total}`, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'MASS_DISCONNECT', {
            channelId: channel.id, disconnected, failed, total,
        });
    },
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
