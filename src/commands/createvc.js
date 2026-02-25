'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { checkBotPermissions } = require('../utils/permissions');

// Suivre les salons temporaires pour auto-suppression
const tempChannels = new Set();

module.exports = {
    name: 'createvc',
    aliases: [],
    description: 'Créer un salon vocal, optionnellement temporaire.',
    usage: '=createvc "nom" [userLimit] [temp:true|false]',
    tempChannels,

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({
                embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)],
            });
        }

        // Parser les arguments
        // Format : =createvc "nom" [limit] [temp:true]
        const fullText = args.join(' ');
        const nameMatch = fullText.match(/^"([^"]+)"/);
        const channelName = nameMatch ? nameMatch[1] : args[0];

        if (!channelName) {
            return message.reply({
                embeds: [errorEmbed('Utilisation : `=createvc "nom" [userLimit] [temp:true|false]`')],
            });
        }

        // Extraire userLimit
        const limitMatch = fullText.match(/\b(\d{1,3})\b/);
        const userLimit = limitMatch ? parseInt(limitMatch[1], 10) : 0;

        // Extraire temp
        const isTemp = /temp:true/i.test(fullText);

        try {
            const channel = await message.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                userLimit: userLimit > 0 ? userLimit : undefined,
            });

            if (isTemp) {
                tempChannels.add(channel.id);
            }

            await message.reply({
                embeds: [
                    successEmbed(`Salon vocal créé : **${channel.name}**`)
                        .addFields(
                            { name: 'ID', value: `\`${channel.id}\``, inline: true },
                            { name: 'Limite', value: userLimit > 0 ? `${userLimit}` : 'Aucune', inline: true },
                            { name: 'Temporaire', value: isTemp ? 'Oui (supprimé quand vide)' : 'Non', inline: true }
                        ),
                ],
            });

            await auditAndNotify(message.guild, message.author.id, 'CREATE_VC', {
                channelId: channel.id,
                channelName: channel.name,
                userLimit,
                isTemp,
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible de créer le salon : ${err.message}`)],
            });
        }
    },
};
