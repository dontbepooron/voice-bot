'use strict';

const { ChannelType } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser, resolveChannel } = require('../utils/resolvers');

module.exports = {
    name: 'move',
    aliases: [],
    description: "Déplacer un utilisateur d'un salon vocal vers un autre.",
    usage: '=move @user [#salon]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const userInput = args[0];
        if (!userInput) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=move @user [#salon]`')] });
        }

        const member = await resolveUser(message.guild, userInput);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable dans ce serveur.')] });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        const sourceChannel = member.voice.channel;

        // Déterminer le salon cible
        let targetChannel;
        if (args[1]) {
            targetChannel = resolveChannel(message.guild, args[1]);
            if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
                return message.reply({ embeds: [errorEmbed('Salon vocal cible introuvable ou invalide.')] });
            }
        } else {
            // Par défaut : salon du bot
            const botVc = message.guild.members.me?.voice?.channel;
            if (!botVc) {
                return message.reply({
                    embeds: [errorEmbed('Aucun salon cible précisé et le bot n\'est pas dans un salon vocal.')],
                });
            }
            targetChannel = botVc;
        }

        const result = await voiceService.performMove(member, targetChannel);
        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [
                successEmbed(`Déplacement réussi : **${sourceChannel.name}** → **${targetChannel.name}**`)
                    .addFields(
                        { name: 'Utilisateur', value: `<@${member.id}>`, inline: true },
                        { name: 'Source', value: sourceChannel.name, inline: true },
                        { name: 'Destination', value: targetChannel.name, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'MOVE', {
            targetId: member.id,
            fromChannel: sourceChannel.id,
            toChannel: targetChannel.id,
        });
    },
};
