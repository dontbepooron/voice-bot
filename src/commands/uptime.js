'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { infoEmbed } = require('../utils/embed');

const startTime = Date.now();

module.exports = {
    name: 'uptime',
    aliases: [],
    description: "Afficher le temps d'activité du bot.",
    usage: '=uptime',

    async run(message) {
        if (!(await ownerOnly(message))) return;

        const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}j`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);

        const embed = infoEmbed('⏱️ Uptime', [
            { name: "Temps d'activité", value: parts.join(' '), inline: true },
            { name: 'Démarré le', value: new Date(startTime).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true },
            { name: 'Mémoire', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} Mo`, inline: true },
        ]);

        return message.reply({ embeds: [embed] });
    },
};
