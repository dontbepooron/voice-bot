'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const db = require('../services/database');
const { successEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
    name: 'prefix',
    aliases: [],
    description: 'Changer le préfixe du bot pour cette guilde.',
    usage: '=prefix set <nouveauPrefix>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const sub = args[0]?.toLowerCase();
        if (sub !== 'set' || !args[1]) {
            return message.reply({
                embeds: [errorEmbed('Utilisation : `=prefix set <nouveauPrefix>`')],
            });
        }

        const newPrefix = args[1];
        if (newPrefix.length > 5) {
            return message.reply({
                embeds: [errorEmbed('Le préfixe ne peut pas dépasser 5 caractères.')],
            });
        }

        // Upsert guild_config
        const existing = db.get('SELECT guildId FROM guild_config WHERE guildId = ?', message.guild.id);
        if (existing) {
            db.run('UPDATE guild_config SET prefix = ? WHERE guildId = ?', newPrefix, message.guild.id);
        } else {
            db.run(
                'INSERT INTO guild_config (guildId, prefix) VALUES (?, ?)',
                message.guild.id,
                newPrefix
            );
        }

        await message.reply({
            embeds: [successEmbed(`Préfixe changé en \`${newPrefix}\` pour ce serveur.`)],
        });

        await auditAndNotify(message.guild, message.author.id, 'PREFIX_CHANGE', {
            newPrefix,
        });
    },
};
