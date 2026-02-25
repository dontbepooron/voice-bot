'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');
const config = require('../../config.json');

module.exports = {
    name: 'disconnect',
    aliases: ['dc', 'kick-voice', 'vkick'],
    description: "Déconnecter un utilisateur du salon vocal.",
    usage: '=disconnect @user [raison]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=disconnect @user [raison]`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        if (member.id === config.supremeOwnerId) {
            return message.reply({ embeds: [errorEmbed('Impossible de déconnecter le Supreme Owner.')] });
        }

        if (!member.voice?.channel) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        const channelName = member.voice.channel.name;
        const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

        try {
            await member.voice.disconnect();
            await message.reply({
                embeds: [
                    successEmbed(`<@${member.id}> a été déconnecté du salon **${channelName}**.`)
                        .addFields({ name: 'Raison', value: reason, inline: false }),
                ],
            });

            await auditAndNotify(message.guild, message.author.id, 'DISCONNECT', {
                targetId: member.id, channelName, reason,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de déconnecter : ${err.message}`)] });
        }
    },
};
