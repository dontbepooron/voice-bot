'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../services/database');
const config = require('../../config.json');

const commands = new Map();
const aliases = new Map();

/**
 * Charge toutes les commandes depuis src/commands/.
 */
function loadCommands() {
    const commandsDir = path.resolve(__dirname, '../commands');
    const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const cmd = require(path.join(commandsDir, file));
        if (!cmd.name) continue;

        commands.set(cmd.name, cmd);

        if (cmd.aliases && Array.isArray(cmd.aliases)) {
            for (const alias of cmd.aliases) {
                aliases.set(alias, cmd.name);
            }
        }
    }

    console.log(`[Commands] ${commands.size} commandes chargées.`);
}

/**
 * Récupère le préfixe pour une guilde (personnalisé ou par défaut).
 * @param {string} guildId
 * @returns {string}
 */
function getPrefix(guildId) {
    const row = db.get('SELECT prefix FROM guild_config WHERE guildId = ?', guildId);
    return row?.prefix || config.prefix;
}

/**
 * Gère un message entrant et route vers la commande appropriée.
 * @param {import('discord.js').Message} message
 */
async function handleCommand(message) {
    if (message.author.bot || !message.guild) return;

    const prefix = getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const content = message.content.slice(prefix.length).trim();
    if (!content) return;

    const args = content.split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Résoudre par nom direct ou alias
    const resolvedName = commands.has(commandName)
        ? commandName
        : aliases.get(commandName);

    if (!resolvedName) return;

    const cmd = commands.get(resolvedName);
    if (!cmd) return;

    try {
        await cmd.run(message, args, commandName);
    } catch (err) {
        console.error(`[Command Error] ${commandName}:`, err);
        const { errorEmbed } = require('../utils/embed');
        try {
            await message.reply({
                embeds: [errorEmbed(`Une erreur interne est survenue : \`${err.message}\``)],
            });
        } catch { /* impossible d'envoyer */ }
    }
}

module.exports = { loadCommands, handleCommand, commands, getPrefix };
