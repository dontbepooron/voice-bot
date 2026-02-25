'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const db = require('../services/database');
const { infoEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
    name: 'audit',
    aliases: ['logs', 'auditlog'],
    description: "Afficher les dernières entrées de l'audit log.",
    usage: '=audit [nombre]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const limit = Math.min(parseInt(args[0], 10) || 15, 25);

        const logs = db.all(
            'SELECT * FROM audit_logs WHERE guildId = ? ORDER BY timestamp DESC LIMIT ?',
            message.guild.id,
            limit
        );

        if (logs.length === 0) {
            return message.reply({
                embeds: [infoEmbed('📋 Audit Log', [], '*Aucune entrée trouvée.*')],
            });
        }

        const lines = logs.map((log, i) => {
            const date = new Date(log.timestamp).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
            let details = '';
            try {
                const payload = JSON.parse(log.payload);
                if (payload.targetId) details += ` → <@${payload.targetId}>`;
                if (payload.reason) details += ` (${payload.reason})`;
            } catch { }
            return `\`${i + 1}.\` **${log.action}** par <@${log.actorId}>${details}\n> *${date}*`;
        });

        // Paginer si trop long (Discord limite 4096 chars)
        const description = lines.join('\n\n');
        const pages = [];
        const MAX_LEN = 3900;

        if (description.length <= MAX_LEN) {
            pages.push(description);
        } else {
            let current = '';
            for (const line of lines) {
                if ((current + '\n\n' + line).length > MAX_LEN) {
                    pages.push(current);
                    current = line;
                } else {
                    current += (current ? '\n\n' : '') + line;
                }
            }
            if (current) pages.push(current);
        }

        for (let i = 0; i < pages.length; i++) {
            const title = pages.length > 1
                ? `📋 Audit Log (${i + 1}/${pages.length})`
                : '📋 Audit Log';
            await message.reply({
                embeds: [infoEmbed(title, [], pages[i])],
            });
        }
    },
};
