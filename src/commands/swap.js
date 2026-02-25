'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'swap',
    aliases: [],
    description: 'Échanger les salons vocaux de deux utilisateurs.',
    usage: '=swap @user1 @user2',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (args.length < 2) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=swap @user1 @user2`')] });
        }

        const memberA = await resolveUser(message.guild, args[0]);
        const memberB = await resolveUser(message.guild, args[1]);

        if (!memberA) {
            return message.reply({ embeds: [errorEmbed('Premier utilisateur introuvable.')] });
        }
        if (!memberB) {
            return message.reply({ embeds: [errorEmbed('Deuxième utilisateur introuvable.')] });
        }

        const result = await voiceService.performSwap(memberA, memberB);
        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [
                successEmbed(`Échange effectué : <@${memberA.id}> ↔ <@${memberB.id}>`)
                    .addFields(
                        { name: 'Utilisateur A', value: `<@${memberA.id}>`, inline: true },
                        { name: 'Utilisateur B', value: `<@${memberB.id}>`, inline: true }
                    ),
            ],
        });

        await auditAndNotify(message.guild, message.author.id, 'SWAP', {
            userA: memberA.id,
            userB: memberB.id,
        });
    },
};
