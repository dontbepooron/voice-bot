'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { getUserHistory, getUserTotalTime } = require('../services/voiceTracker');
const { infoEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'voicelog',
    aliases: ['vclog', 'vhistory'],
    description: "Historique des sessions vocales d'un utilisateur.",
    usage: '=voicelog @user [nombre]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=voicelog @user [nombre]`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        const limit = Math.min(parseInt(args[1], 10) || 10, 20);
        const history = getUserHistory(message.guild.id, member.id, limit);
        const totalMs = getUserTotalTime(message.guild.id, member.id);
        const totalHours = (totalMs / 3_600_000).toFixed(1);

        if (history.length === 0) {
            return message.reply({
                embeds: [
                    infoEmbed(`📜 Historique vocal de ${member.user.tag}`, [], '*Aucune session enregistrée.*'),
                ],
            });
        }

        const lines = history.map((s, i) => {
            const join = new Date(s.joinedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
            const durMin = (s.duration / 60_000).toFixed(0);
            return `\`${i + 1}.\` **${s.channelName || '?'}** — ${durMin} min\n> ${join}`;
        });

        const embed = infoEmbed(
            `📜 Historique vocal — ${member.user.tag}`,
            [
                { name: 'Total cette semaine', value: `${totalHours}h`, inline: true },
                { name: 'Sessions affichées', value: `${history.length}`, inline: true },
            ],
            lines.join('\n\n')
        );

        return message.reply({ embeds: [embed] });
    },
};
