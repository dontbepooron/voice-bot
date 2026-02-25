'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'join',
    aliases: [],
    description: "Faire rejoindre le bot au salon vocal d'un utilisateur.",
    usage: '=join @user | =join userId',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const input = args[0];
        if (!input) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=join @user` ou `=join userId`')] });
        }

        const member = await resolveUser(message.guild, input);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable dans ce serveur.')] });
        }

        const vc = member.voice?.channel;
        if (!vc) {
            return message.reply({
                embeds: [errorEmbed(`<@${member.id}> n'est pas connecté au vocal.`)],
            });
        }

        const result = voiceService.botJoinChannel(vc);
        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [successEmbed(`Bot connecté au salon **${vc.name}**.`)],
        });

        await auditAndNotify(message.guild, message.author.id, 'BOT_JOIN', {
            channelId: vc.id,
            channelName: vc.name,
        });
    },
};
