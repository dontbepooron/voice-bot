'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const ownerService = require('../services/ownerService');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embed');
const { resolveUser, extractUserId } = require('../utils/resolvers');
const config = require('../../config.json');

module.exports = {
    name: 'owner',
    aliases: [],
    description: "Gérer les owners de la guilde (add/remove/list).",
    usage: '=owner add @user | =owner remove @user | =owner list',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const sub = args[0]?.toLowerCase();

        if (sub === 'add') return handleAdd(message, args.slice(1));
        if (sub === 'remove') return handleRemove(message, args.slice(1));
        if (sub === 'list') return handleList(message);

        return message.reply({
            embeds: [errorEmbed('Sous-commande invalide. Utilisation : `=owner add|remove|list`')],
        });
    },
};

async function handleAdd(message, args) {
    const input = args[0];
    if (!input) {
        return message.reply({ embeds: [errorEmbed('Utilisation : `=owner add @user` ou `=owner add userId`')] });
    }

    const userId = extractUserId(input);
    if (!userId) {
        return message.reply({ embeds: [errorEmbed('ID utilisateur invalide.')] });
    }

    const result = ownerService.addOwner(message.guild.id, userId, message.author.id);
    if (!result.success) {
        return message.reply({ embeds: [errorEmbed(result.reason)] });
    }

    const addedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    await message.reply({
        embeds: [
            successEmbed(`<@${userId}> a été ajouté en tant qu'owner.`)
                .addFields(
                    { name: 'Utilisateur', value: `<@${userId}> (\`${userId}\`)`, inline: true },
                    { name: "Date d'ajout", value: addedAt, inline: true }
                ),
        ],
    });

    await auditAndNotify(message.guild, message.author.id, 'OWNER_ADD', { targetId: userId }, [
        { name: 'Acteur', value: `<@${message.author.id}>`, inline: true },
        { name: 'Cible', value: `<@${userId}>`, inline: true },
        { name: 'Action', value: 'Ajout owner', inline: true },
    ]);
}

async function handleRemove(message, args) {
    const input = args[0];
    if (!input) {
        return message.reply({ embeds: [errorEmbed('Utilisation : `=owner remove @user` ou `=owner remove userId`')] });
    }

    const userId = extractUserId(input);
    if (!userId) {
        return message.reply({ embeds: [errorEmbed('ID utilisateur invalide.')] });
    }

    const result = ownerService.removeOwner(message.guild.id, userId, message.author.id);
    if (!result.success) {
        return message.reply({ embeds: [errorEmbed(result.reason)] });
    }

    await message.reply({
        embeds: [successEmbed(`<@${userId}> a été retiré de la liste des owners.`)],
    });

    await auditAndNotify(message.guild, message.author.id, 'OWNER_REMOVE', { targetId: userId }, [
        { name: 'Acteur', value: `<@${message.author.id}>`, inline: true },
        { name: 'Cible', value: `<@${userId}>`, inline: true },
        { name: 'Action', value: 'Retrait owner', inline: true },
    ]);
}

async function handleList(message) {
    const owners = ownerService.listOwners(message.guild.id);
    const lines = owners.map((o, i) => {
        const date = new Date(o.addedAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
        return `**${i + 1}.** <@${o.userId}> (\`${o.userId}\`) — ajouté le ${date}`;
    });

    // Toujours afficher le Supreme Owner
    const supremeLine = `👑 **Supreme Owner** : <@${config.supremeOwnerId}> (\`${config.supremeOwnerId}\`)`;

    const description = lines.length > 0
        ? `${supremeLine}\n\n${lines.join('\n')}`
        : `${supremeLine}\n\n*Aucun autre owner enregistré.*`;

    return message.reply({
        embeds: [infoEmbed('📋 Liste des Owners', [], description)],
    });
}
