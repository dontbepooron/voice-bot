'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { infoEmbed } = require('../utils/embed');

module.exports = {
    name: 'ping',
    aliases: [],
    description: 'Afficher la latence du bot et de l\'API Discord.',
    usage: '=ping',

    async run(message) {
        if (!(await ownerOnly(message))) return;

        const sent = await message.reply({
            embeds: [infoEmbed('🏓 Pong !', [{ name: 'Calcul...', value: '⏳', inline: true }])],
        });

        const roundtrip = sent.createdTimestamp - message.createdTimestamp;
        const wsLatency = message.client.ws.ping;

        await sent.edit({
            embeds: [
                infoEmbed('🏓 Pong !', [
                    { name: 'Latence aller-retour', value: `${roundtrip}ms`, inline: true },
                    { name: 'Latence WebSocket', value: `${wsLatency}ms`, inline: true },
                ]),
            ],
        });
    },
};
