'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'find',
    aliases: [],
    description: "Trouver dans quel salon vocal se trouve un utilisateur.",
    usage: '=find @user | =find userId',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const input = args[0];
        if (!input) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=find @user` ou `=find userId`')] });
        }

        const member = await resolveUser(message.guild, input);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable dans ce serveur.')] });
        }

        const vc = member.voice?.channel;
        if (!vc) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        // Vérifier si on peut voir le salon
        const botPerms = vc.permissionsFor(message.guild.members.me);
        if (!botPerms || !botPerms.has('ViewChannel')) {
            return message.reply({
                embeds: [errorEmbed('Salon privé / inaccessible pour le bot.')],
            });
        }

        const membersList = vc.members.map(m => `<@${m.id}>`).join(', ') || 'Aucun';
        const isPrivate = !vc.permissionsFor(message.guild.roles.everyone).has('Connect');

        const embed = infoEmbed(`🔍 Localisation de ${member.user.tag}`, [
            { name: 'Salon', value: `<#${vc.id}>`, inline: true },
            { name: 'ID du salon', value: `\`${vc.id}\``, inline: true },
            { name: 'Membres', value: `${vc.members.size}${vc.userLimit > 0 ? `/${vc.userLimit}` : ''}`, inline: true },
            { name: 'Bitrate', value: `${vc.bitrate / 1000} kbps`, inline: true },
            { name: 'Accès', value: isPrivate ? '🔒 Privé' : '🔓 Public', inline: true },
            { name: 'Liste des membres', value: membersList, inline: false },
        ]);

        await message.reply({ embeds: [embed] });

        await auditAndNotify(message.guild, message.author.id, 'FIND_USER', {
            targetId: member.id,
            channelId: vc.id,
        });
    },
};
