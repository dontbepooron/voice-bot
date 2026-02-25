'use strict';

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'support',
    aliases: ['invite', 'aide'],
    description: "Affiche les liens de support et d'invitation du bot.",
    usage: '=support',

    async run(message, args) {
        // Embed principal de présentation
        const mainEmbed = new EmbedBuilder()
            .setTitle('🌟 Centre de Support & Communauté Voice Bot')
            .setDescription("Besoin d'aide avec le bot ? Envie de rejoindre la communauté ou de suivre les dernières mises à jour ? Vous êtes au bon endroit !")
            .setColor('#2b2d31')
            .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields([
                {
                    name: '🛠️ Assistance Rapide',
                    value: "Rejoignez notre serveur Discord pour discuter avec l'équipe de développement, reporter un bug, ou proposer une nouveauté !"
                },
                {
                    name: '🛡️ Premium & Avantages',
                    value: "Découvrez les avantages exclusifs offerts aux membres de notre serveur support."
                },
                {
                    name: '🔗 Liens Utiles',
                    value: "• [Site Web](https://discord.gg/etQByzdvxr) | [Documentation](https://discord.gg/etQByzdvxr)"
                }
            ])
            .setImage('https://i.imgur.com/OWFoD5V.png')
            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL({ dynamic: true }) })
            .setFooter({
                text: 'Merci de faire confiance à Voice Bot !',
                iconURL: message.guild?.iconURL({ dynamic: true }) ?? undefined
            })
            .setTimestamp();

        // Embed pour les statistiques ou infos bonus
        const infoEmbed = new EmbedBuilder()
            .setColor('#5865f2')
            .setDescription('**Pourquoi nous rejoindre ?**\n✨ Mises à jour en avant-première\n🎁 Giveaways exclusifs\n💬 Une communauté active et bienveillante');

        // Création des boutons
        const supportBtn = new ButtonBuilder()
            .setLabel('Rejoindre le Support')
            .setURL('https://discord.gg/etQByzdvxr')
            .setStyle(ButtonStyle.Link)
            .setEmoji('💎');

        const inviteBtn = new ButtonBuilder()
            .setLabel('Inviter le Bot')
            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot%20applications.commands`)
            .setStyle(ButtonStyle.Link)
            .setEmoji('🤖');

        const row = new ActionRowBuilder().addComponents(supportBtn, inviteBtn);

        // Envoyer la réponse complexe avec plusieurs embeds et les composants
        await message.reply({
            embeds: [mainEmbed, infoEmbed],
            components: [row]
        });
    },
};