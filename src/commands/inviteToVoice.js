'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed, infoEmbed } = require('../utils/embed');
const { resolveUser } = require('../utils/resolvers');

module.exports = {
    name: 'invite-to-voice',
    aliases: ['invitevoice', 'vinvite'],
    description: "Envoyer une invitation interactive pour rejoindre un salon vocal.",
    usage: '=invite-to-voice @user',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Utilisation : `=invite-to-voice @user`')] });
        }

        const member = await resolveUser(message.guild, args[0]);
        if (!member) {
            return message.reply({ embeds: [errorEmbed('Utilisateur introuvable.')] });
        }

        const authorVc = message.member?.voice?.channel;
        if (!authorVc) {
            return message.reply({
                embeds: [errorEmbed("Vous devez être connecté à un salon vocal pour envoyer une invitation.")],
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`voice_invite_accept:${authorVc.id}:${member.id}`)
                .setLabel('✅ Rejoindre')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`voice_invite_decline:${authorVc.id}:${member.id}`)
                .setLabel('❌ Refuser')
                .setStyle(ButtonStyle.Danger)
        );

        const inviteEmbed = infoEmbed(
            '🎙️ Invitation vocale',
            [
                { name: 'De', value: `<@${message.author.id}>`, inline: true },
                { name: 'Salon', value: authorVc.name, inline: true },
                { name: 'Membres', value: `${authorVc.members.size}`, inline: true },
            ],
            `<@${member.id}>, vous êtes invité(e) à rejoindre le salon vocal **${authorVc.name}** !`
        );

        try {
            const sentMsg = await message.channel.send({
                content: `<@${member.id}>`,
                embeds: [inviteEmbed],
                components: [row],
            });

            // Collecter la réponse (60 secondes)
            const collector = sentMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === member.id,
                time: 60_000,
                max: 1,
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId.startsWith('voice_invite_accept')) {
                    try {
                        const freshMember = await message.guild.members.fetch(member.id);
                        if (freshMember.voice?.channel) {
                            await freshMember.voice.setChannel(authorVc);
                        }
                        await interaction.update({
                            embeds: [successEmbed(`<@${member.id}> a accepté l'invitation et rejoint **${authorVc.name}**.`)],
                            components: [],
                        });
                        await auditAndNotify(message.guild, message.author.id, 'VOICE_INVITE_ACCEPTED', {
                            targetId: member.id,
                            channelId: authorVc.id,
                        });
                    } catch (err) {
                        await interaction.update({
                            embeds: [errorEmbed(`Impossible de déplacer : ${err.message}`)],
                            components: [],
                        });
                    }
                } else {
                    await interaction.update({
                        embeds: [errorEmbed(`<@${member.id}> a refusé l'invitation.`)],
                        components: [],
                    });
                    await auditAndNotify(message.guild, message.author.id, 'VOICE_INVITE_DECLINED', {
                        targetId: member.id,
                        channelId: authorVc.id,
                    });
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    try {
                        await sentMsg.edit({
                            embeds: [errorEmbed("L'invitation a expiré (60 secondes).")],
                            components: [],
                        });
                    } catch { /* message supprimé */ }
                }
            });

            await message.reply({
                embeds: [successEmbed(`Invitation envoyée à <@${member.id}>.`)],
            });
        } catch (err) {
            return message.reply({
                embeds: [errorEmbed(`Impossible d'envoyer l'invitation : ${err.message}`)],
            });
        }
    },
};
