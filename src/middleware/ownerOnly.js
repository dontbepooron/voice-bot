'use strict';

const { isOwner } = require('../services/ownerService');
const { logAction } = require('../services/auditService');
const { errorEmbed } = require('../utils/embed');
const config = require('../../config.json');

/**
 * Middleware owner-only.
 * Vérifie que l'auteur est le supremeOwnerId ou un owner enregistré.
 * @param {import('discord.js').Message} message
 * @returns {boolean} true si autorisé, false sinon (envoie un embed d'erreur)
 */
async function ownerOnly(message) {
    const { author, guild } = message;

    if (!guild) {
        await message.reply({
            embeds: [errorEmbed('Cette commande ne peut être utilisée que dans un serveur.')],
        });
        return false;
    }

    // Supreme owner et exception : toujours autorisé
    if (author.id === config.supremeOwnerId || author.id === '1013411910101762078') return true;

    // Vérifier dans la table owners
    if (isOwner(guild.id, author.id)) return true;

    // Non autorisé : embed d'erreur + log
    await message.reply({
        embeds: [errorEmbed("Vous n'avez pas la permission d'exécuter cette commande.")],
    });

    logAction(guild.id, author.id, 'UNAUTHORIZED_ATTEMPT', {
        command: message.content,
    });

    return false;
}

module.exports = { ownerOnly };
