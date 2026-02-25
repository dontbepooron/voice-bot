'use strict';

const { ChannelType } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');

module.exports = {
    name: 'massmove',
    aliases: [],
    description: "Déplacer tous les membres d'un salon vocal vers un autre.",
    usage: '=massmove #from #to',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (args.length < 2) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=massmove #source #destination`')] });
        }

        const fromChannel = resolveChannel(message.guild, args[0]);
        const toChannel = resolveChannel(message.guild, args[1]);

        if (!fromChannel || fromChannel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon source introuvable ou invalide.')] });
        }
        if (!toChannel || toChannel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon destination introuvable ou invalide.')] });
        }

        if (fromChannel.members.size === 0) {
            return message.reply({ embeds: [errorEmbed('Le salon source est vide.')] });
        }

        const startTime = Date.now();
        const result = await voiceService.performMassMove(fromChannel, toChannel);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        const fields = [
            { name: 'Source', value: fromChannel.name, inline: true },
            { name: 'Destination', value: toChannel.name, inline: true },
            { name: 'Déplacés', value: `${result.moved}`, inline: true },
            { name: 'Échecs', value: `${result.failed}`, inline: true },
            { name: 'Durée', value: `${duration}s`, inline: true },
        ];

        if (result.errors.length > 0) {
            fields.push({
                name: 'Erreurs',
                value: result.errors.slice(0, 5).join('\n'),
                inline: false,
            });
        }

        await message.reply({
            embeds: [
                successEmbed(`Mass move terminé : ${result.moved} membre(s) déplacé(s).`)
                    .addFields(fields),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'MASS_MOVE', {
            fromChannel: fromChannel.id,
            toChannel: toChannel.id,
            moved: result.moved,
            failed: result.failed,
            duration,
        });
    },
};
