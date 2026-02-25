'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const db = require('../services/database');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embed');

module.exports = {
    name: 'config',
    aliases: [],
    description: 'Voir ou modifier la configuration de la guilde.',
    usage: '=config view | =config set <clé> <valeur>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const sub = args[0]?.toLowerCase();

        if (sub === 'view') return handleView(message);
        if (sub === 'set') return handleSet(message, args.slice(1));

        return message.reply({
            embeds: [errorEmbed('Utilisation : `=config view` ou `=config set <clé> <valeur>`')],
        });
    },
};

async function handleView(message) {
    const row = db.get('SELECT * FROM guild_config WHERE guildId = ?', message.guild.id);

    if (!row) {
        return message.reply({
            embeds: [infoEmbed('⚙️ Configuration du serveur', [], '*Aucune configuration personnalisée. Valeurs par défaut utilisées.*')],
        });
    }

    let settings = {};
    try {
        settings = row.settings ? JSON.parse(row.settings) : {};
    } catch { /* JSON invalide */ }

    const fields = [
        { name: 'Préfixe', value: row.prefix || '*par défaut*', inline: true },
        { name: 'Salon de logs', value: row.loggingChannelId ? `<#${row.loggingChannelId}>` : '*non configuré*', inline: true },
    ];

    if (Object.keys(settings).length > 0) {
        fields.push({
            name: 'Paramètres personnalisés',
            value: Object.entries(settings).map(([k, v]) => `\`${k}\` : \`${v}\``).join('\n'),
            inline: false,
        });
    }

    return message.reply({
        embeds: [infoEmbed('⚙️ Configuration du serveur', fields)],
    });
}

async function handleSet(message, args) {
    const key = args[0]?.toLowerCase();
    const value = args.slice(1).join(' ');

    if (!key || !value) {
        return message.reply({
            embeds: [errorEmbed('Utilisation : `=config set <clé> <valeur>`\nClés : `loggingChannelId`, `prefix`')],
        });
    }

    // Clés autorisées
    const allowedDirectKeys = ['prefix', 'loggingchannelid'];
    const dbKey = key === 'loggingchannelid' ? 'loggingChannelId' : key;

    // Upsert guild_config
    const existing = db.get('SELECT guildId FROM guild_config WHERE guildId = ?', message.guild.id);

    if (allowedDirectKeys.includes(key)) {
        if (existing) {
            db.run(`UPDATE guild_config SET ${dbKey} = ? WHERE guildId = ?`, value, message.guild.id);
        } else {
            db.run(
                `INSERT INTO guild_config (guildId, ${dbKey}) VALUES (?, ?)`,
                message.guild.id,
                value
            );
        }
    } else {
        // Stocker dans le champ settings JSON
        let settings = {};
        if (existing) {
            const row = db.get('SELECT settings FROM guild_config WHERE guildId = ?', message.guild.id);
            try { settings = row?.settings ? JSON.parse(row.settings) : {}; } catch { /* */ }
            settings[key] = value;
            db.run('UPDATE guild_config SET settings = ? WHERE guildId = ?', JSON.stringify(settings), message.guild.id);
        } else {
            settings[key] = value;
            db.run(
                'INSERT INTO guild_config (guildId, settings) VALUES (?, ?)',
                message.guild.id,
                JSON.stringify(settings)
            );
        }
    }

    await message.reply({
        embeds: [successEmbed(`Configuration mise à jour : \`${key}\` = \`${value}\``)],
    });

    await auditAndNotify(message.guild, message.author.id, 'CONFIG_SET', {
        key,
        value,
    });
}
