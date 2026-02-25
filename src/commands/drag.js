'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'drag',
    aliases: ['pull', 'grab'],
    description: "Tirer un utilisateur dans votre salon vocal.",
    usage: '=drag @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=drag @user`')] });
        }

        const authorVc = message.member?.voice?.channel;
        if (!authorVc) {
            return message.reply({
                embeds: [errorEmbed('Vous devez être connecté à un salon vocal.')],
            });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        if (member.voice.channel.id === authorVc.id) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> est déjà dans votre salon.`)],
            });
        }

        const sourceChannel = member.voice.channel;
        const result = await voiceService.performMove(member, authorVc);

        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [
                successEmbed(`<@${member.id}> a été tiré dans **${authorVc.name}**.`)
                    .addFields(
                        { name: 'Depuis', value: sourceChannel.name, inline: true },
                        { name: 'Vers', value: authorVc.name, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'DRAG', {
            targetId: member.id,
            fromChannel: sourceChannel.id,
            toChannel: authorVc.id,
        });
    },
};
