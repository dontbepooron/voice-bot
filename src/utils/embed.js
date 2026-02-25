'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const COLOR = parseInt(config.embedColor.replace('#', ''), 16);

/**
 * Crée un embed de succès.
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function successEmbed(description) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setDescription(`${config.emojiPositive} ${description}`)
        .setTimestamp();
}

/**
 * Crée un embed d'erreur.
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function errorEmbed(description) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setDescription(`${config.emojiNegative} ${description}`)
        .setTimestamp();
}

/**
 * Crée un embed d'information avec des champs.
 * @param {string} title
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields
 * @param {string} [description]
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, fields = [], description = null) {
    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(title)
        .setTimestamp();

    if (description) embed.setDescription(description);
    if (fields.length) embed.addFields(fields);

    return embed;
}

/**
 * Crée un embed d'audit pour le canal de logging.
 * @param {string} action
 * @param {Array<{name: string, value: string, inline?: boolean}>} fields
 * @returns {EmbedBuilder}
 */
function auditEmbed(action, fields = []) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`📋 ${action}`)
        .addFields(fields)
        .setFooter({ text: new Date().toISOString() })
        .setTimestamp();
}

module.exports = { successEmbed, errorEmbed, infoEmbed, auditEmbed };
