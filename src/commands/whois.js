'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { isOwner } = require('../services/ownerService');
const { infoEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'whois',
    aliases: [],
    description: "Afficher les infos détaillées d'un utilisateur.",
    usage: '=whois @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=whois @user`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        const roles = member.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `<@&${r.id}>`)
            .join(', ') || 'Aucun rôle';

        const ownerStatus = isOwner(message.guild.id, member.id) ? '✅ Owner' : '❌ Non-owner';
        const voiceChannel = member.voice?.channel ? `🔊 ${member.voice.channel.name}` : '📵 Non connecté';

        const joinedAt = member.joinedAt
            ? member.joinedAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
            : 'Inconnu';
        const createdAt = member.user.createdAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

        const embed = infoEmbed(`👤 Informations sur ${member.user.tag}`, [
            { name: 'ID', value: `\`${member.id}\``, inline: true },
            { name: 'Statut Owner', value: ownerStatus, inline: true },
            { name: 'Salon vocal', value: voiceChannel, inline: true },
            { name: 'Rejoint le serveur', value: joinedAt, inline: true },
            { name: 'Compte créé le', value: createdAt, inline: true },
            { name: 'Rôles', value: roles.substring(0, 1024), inline: false },
        ]);

        if (member.user.avatarURL()) {
            embed.setThumbnail(member.user.avatarURL({ dynamic: true, size: 256 }));
        }

        return message.reply({ embeds: [embed] });
    },
};
