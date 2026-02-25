'use strict';

const { ownerOnly } = require('../middleware/ownerOnly');
const { errorEmbed, infoEmbed } = require('../utils/embed');

module.exports = {
    name: 'rtc-record',
    aliases: ['rtcrecord'],
    description: "Démarrer ou arrêter un enregistrement RTC (nécessite opt-in explicite).",
    usage: '=rtc-record start|stop #salon',

    async run(message) {
        if (!(await ownerOnly(message))) return;

        return message.reply({
            embeds: [
                infoEmbed(
                    '🎙️ Enregistrement RTC — Non activé',
                    [
                        { name: 'Statut', value: 'Fonctionnalité désactivée', inline: true },
                        {
                            name: 'Raison',
                            value:
                                "L'enregistrement vocal nécessite un **consentement explicite** de tous les participants " +
                                "conformément à la législation en vigueur (RGPD, etc.) et aux conditions d'utilisation de Discord.\n\n" +
                                "Pour activer cette fonctionnalité, veuillez configurer `rtcRecordEnabled: true` dans `config.json` " +
                                "et vous assurer d'obtenir le consentement de tous les participants.",
                            inline: false,
                        },
                    ]
                ),
            ],
        });
    },
};
