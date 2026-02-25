'use strict';

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { infoEmbed, successEmbed, errorEmbed } = require('../utils/embed');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'vcpanel',
    aliases: ['panel', 'controlpanel'],
    description: "Afficher un panneau de contrôle interactif pour le salon vocal.",
    usage: '=vcpanel',

    async run(message) {
        if (!(await ownerOnly(message))) return;

        const channel = message.member?.voice?.channel;
        if (!channel) {
            return message.reply({
                embeds: [errorEmbed('Vous devez être connecté à un salon vocal pour utiliser le panneau.')],
            });
        }

        const membersList = channel.members.map(m => `<@${m.id}>`).join(', ') || 'Aucun';
        const isLocked = !channel.permissionsFor(message.guild.roles.everyone).has('Connect');

        const embed = infoEmbed(`🎛️ Panneau de contrôle — ${channel.name}`, [
            { name: 'Membres', value: `${channel.members.size}${channel.userLimit > 0 ? `/${channel.userLimit}` : ''}`, inline: true },
            { name: 'Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true },
            { name: 'État', value: isLocked ? '🔒 Verrouillé' : '🔓 Ouvert', inline: true },
            { name: 'Dans le salon', value: membersList, inline: false },
        ]);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('panel_lock').setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('panel_unlock').setLabel('🔓 Unlock').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('panel_hide').setLabel('👻 Hide').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('panel_show').setLabel('👁️ Show').setStyle(ButtonStyle.Secondary),
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('panel_muteall').setLabel('🔇 Mute tous').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('panel_unmuteall').setLabel('🔊 Unmute tous').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('panel_dcall').setLabel('⛔ DC tous').setStyle(ButtonStyle.Danger),
        );

        const panelMsg = await message.reply({ embeds: [embed], components: [row1, row2] });

        // Collector pour 5 minutes
        const collector = panelMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 300_000,
        });

        collector.on('collect', async (interaction) => {
            const me = message.guild.members.me;
            const vc = message.member?.voice?.channel;
            if (!vc) {
                return interaction.reply({ embeds: [errorEmbed('Vous n\'êtes plus en vocal.')], ephemeral: true });
            }

            try {
                switch (interaction.customId) {
                    case 'panel_lock':
                        await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                        await interaction.reply({ embeds: [successEmbed(`**${vc.name}** verrouillé. 🔒`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_LOCK', { channelId: vc.id });
                        break;

                    case 'panel_unlock':
                        await vc.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                        await interaction.reply({ embeds: [successEmbed(`**${vc.name}** déverrouillé. 🔓`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_UNLOCK', { channelId: vc.id });
                        break;

                    case 'panel_hide':
                        await vc.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                        await interaction.reply({ embeds: [successEmbed(`**${vc.name}** masqué. 👻`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_HIDE', { channelId: vc.id });
                        break;

                    case 'panel_show':
                        await vc.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
                        await interaction.reply({ embeds: [successEmbed(`**${vc.name}** visible. 👁️`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_SHOW', { channelId: vc.id });
                        break;

                    case 'panel_muteall': {
                        const members = [...vc.members.values()].filter(m => !m.voice.serverMute && m.id !== me.id);
                        for (const m of members) {
                            try { await m.voice.setMute(true); } catch { }
                        }
                        await interaction.reply({ embeds: [successEmbed(`${members.length} membre(s) muté(s). 🔇`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_MUTE_ALL', { channelId: vc.id, count: members.length });
                        break;
                    }

                    case 'panel_unmuteall': {
                        const members = [...vc.members.values()].filter(m => m.voice.serverMute);
                        for (const m of members) {
                            try { await m.voice.setMute(false); } catch { }
                        }
                        await interaction.reply({ embeds: [successEmbed(`${members.length} membre(s) unmuté(s). 🔊`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_UNMUTE_ALL', { channelId: vc.id, count: members.length });
                        break;
                    }

                    case 'panel_dcall': {
                        const members = [...vc.members.values()].filter(m => m.id !== me.id && m.id !== message.author.id);
                        for (const m of members) {
                            try { await m.voice.disconnect(); } catch { }
                        }
                        await interaction.reply({ embeds: [successEmbed(`${members.length} membre(s) déconnecté(s). ⛔`)], ephemeral: true });
                        await auditAndNotify(message.guild, message.author.id, 'PANEL_DC_ALL', { channelId: vc.id, count: members.length });
                        break;
                    }
                }
            } catch (err) {
                await interaction.reply({ embeds: [errorEmbed(`Erreur : ${err.message}`)], ephemeral: true }).catch(() => { });
            }
        });

        collector.on('end', async () => {
            try {
                await panelMsg.edit({ components: [] });
            } catch { }
        });
    },
};
