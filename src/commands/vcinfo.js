'use strict';

const { ChannelType } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { infoEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser, resolveChannel } = require('../utils/resolvers');

module.exports = {
    name: 'vcinfo',
    aliases: [],
    description: "Afficher les informations complètes d'un salon vocal.",
    usage: '=vcinfo [#salon|@user]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        let channel = null;

        if (args[0]) {
            // Tenter de résoudre comme salon d'abord
            channel = resolveChannel(message.guild, args[0]);

            // Sinon tenter comme utilisateur
            if (!channel) {
                const member = await resolveUser(message.guild, args[0]);
                if (member) {
                    channel = member.voice?.channel;
                }
            }
        } else {
            // Salon de l'auteur
            channel = message.member?.voice?.channel;
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({
                embeds: [errorEmbed('Salon vocal introuvable. Utilisation : `=vcinfo [#salon|@user]`')],
            });
        }

        const membersList = channel.members.map(m => `<@${m.id}>`).join('\n') || '*Aucun membre*';
        const isPrivate = !channel.permissionsFor(message.guild.roles.everyone).has('Connect');

        const embed = infoEmbed(`🔊 Informations sur le salon vocal`, [
            { name: 'Nom', value: channel.name, inline: true },
            { name: 'ID', value: `\`${channel.id}\``, inline: true },
            { name: 'Accès', value: isPrivate ? '🔒 Privé' : '🔓 Public', inline: true },
            { name: 'Membres', value: `${channel.members.size}${channel.userLimit > 0 ? `/${channel.userLimit}` : ''}`, inline: true },
            { name: 'Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true },
            { name: 'Limite', value: channel.userLimit > 0 ? `${channel.userLimit}` : 'Aucune', inline: true },
            { name: 'Région', value: channel.rtcRegion || 'Automatique', inline: true },
            { name: 'Liste des membres', value: membersList, inline: false },
        ]);

        await message.reply({ embeds: [embed] });

        await auditAndNotify(message.guild, message.author.id, 'VCINFO', {
            channelId: channel.id,
        });
    },
};
