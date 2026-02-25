'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const voiceService = require('../services/voiceService');
const { successEmbed, errorEmbed } = require('../utils/embed');

module.exports = {
    name: 'leave',
    aliases: [],
    description: 'Faire quitter le bot de son salon vocal actuel.',
    usage: '=leave',

    async run(message) {
        if (!(await ownerOnly(message))) return;

        const result = voiceService.botLeaveChannel(message.guild);
        if (!result.success) {
            return message.reply({ embeds: [errorEmbed(result.reason)] });
        }

        await message.reply({
            embeds: [successEmbed('Bot déconnecté du salon vocal.')],
        });

        await auditAndNotify(message.guild, message.author.id, 'BOT_LEAVE', {});
    },
};
