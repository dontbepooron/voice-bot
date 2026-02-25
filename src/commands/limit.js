'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'limit',
    aliases: ['setlimit', 'userlimit'],
    description: "Modifier la limite d'utilisateurs d'un salon vocal.",
    usage: '=limit #salon <nombre> | =limit <nombre>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel, limitValue;

        // Parser : =limit #salon 10 ou =limit 10 (utilise le salon actuel)
        const possibleChannel = resolveChannel(message.guild, args[0]);
        if (possibleChannel && possibleChannel.type === ChannelType.GuildVoice) {
            channel = possibleChannel;
            limitValue = parseInt(args[1], 10);
        } else {
            channel = message.member?.voice?.channel;
            limitValue = parseInt(args[0], 10);
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        if (isNaN(limitValue) || limitValue < 0 || limitValue > 99) {
            return message.reply({ embeds: [errorEmbed('La limite doit être un nombre entre 0 et 99 (0 = illimité).')] });
        }

        try {
            await channel.setUserLimit(limitValue);
            const limitText = limitValue === 0 ? 'illimitée' : `${limitValue} utilisateur(s)`;
            await message.reply({
                embeds: [successEmbed(`Limite de **${channel.name}** changée à **${limitText}**.`)],
            });

            await auditAndNotify(message.guild, message.author.id, 'SET_LIMIT', {
                channelId: channel.id, limit: limitValue,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de changer la limite : ${err.message}`)] });
        }
    },
};
