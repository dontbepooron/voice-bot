'use strict';

const { ChannelType } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser, resolveChannel } = require('../utils/resolvers');

module.exports = {
    name: 'force-move',
    aliases: ['forcemove'],
    description: "Forcer le déplacement d'un utilisateur vers un salon vocal.",
    usage: '=force-move @user #salon [raison]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const userInput = args[0];
        const channelInput = args[1];

        if (!userInput || !channelInput) {
            return message.reply({
                embeds: [errorEmbed('Utilisation : `=force-move @user #salon [raison]`')],
            });
        }

        const member = await resolveUser(message.guild, userInput);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable dans ce serveur.')] });
        }

        const targetChannel = resolveChannel(message.guild, channelInput);
        if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal cible introuvable ou invalide.')] });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        const sourceChannel = member.voice.channel;
        const reason = args.slice(2).join(' ') || 'Aucune raison fournie';

        const result = await voiceService.performMove(member, targetChannel);
        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [
                successEmbed(`Déplacement forcé effectué.`)
                    .addFields(
                        { name: 'Utilisateur', value: `<@${member.id}>`, inline: true },
                        { name: 'Source', value: sourceChannel.name, inline: true },
                        { name: 'Destination', value: targetChannel.name, inline: true },
                        { name: 'Raison', value: reason, inline: false }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'FORCE_MOVE', {
            targetId: member.id,
            fromChannel: sourceChannel.id,
            toChannel: targetChannel.id,
            reason,
        }, [
            { name: 'Acteur', value: `<@${message.author.id}>`, inline: true },
            { name: 'Cible', value: `<@${member.id}>`, inline: true },
            { name: 'Source → Dest', value: `${sourceChannel.name} → ${targetChannel.name}`, inline: false },
            { name: 'Raison', value: reason, inline: false },
        ]);
    },
};
