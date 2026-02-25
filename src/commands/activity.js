'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { getLeaderboard } = require('../services/voiceTracker');
const { infoEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
    name: 'activity',
    aliases: ['leaderboard', 'vctop', 'voicetop'],
    description: "Classement d'activité vocale des membres (7 derniers jours).",
    usage: '=activity [nombre]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const limit = Math.min(parseInt(args[0], 10) || 10, 25);
        const leaderboard = getLeaderboard(message.guild.id, limit);

        if (leaderboard.length === 0) {
            return message.reply({
                embeds: [infoEmbed('🏆 Activité vocale', [], '*Aucune donnée disponible. Les sessions vocales sont enregistrées automatiquement.*')],
            });
        }

        const lines = leaderboard.map((entry, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`${i + 1}.\``;
            const hours = (entry.totalDuration / 3_600_000).toFixed(1);
            const sessions = entry.sessionCount;
            return `${medal} <@${entry.userId}> — **${hours}h** (${sessions} session${sessions > 1 ? 's' : ''})`;
        });

        const embed = infoEmbed(
            '🏆 Classement vocal — 7 derniers jours',
            [],
            lines.join('\n')
        );

        return message.reply({ embeds: [embed] });
    },
};
