'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { auditAndNotify } = require('../services/auditService');
const { successEmbed, errorEmbed } = require('../utils/embed');
const { resolveChannel } = require('../utils/resolvers');
const { checkBotPermissions } = require('../utils/permissions');

module.exports = {
    name: 'rename',
    aliases: ['vcname', 'renamechannel'],
    description: "Renommer un salon vocal.",
    usage: '=rename #salon <nouveau nom> | =rename <nouveau nom>',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        const permCheck = checkBotPermissions(message.guild, [PermissionsBitField.Flags.ManageChannels]);
        if (!permCheck.ok) {
            return message.reply({ embeds: [errorEmbed(`Permissions manquantes : ${permCheck.missing.join(', ')}`)] });
        }

        let channel, newName;

        const possibleChannel = resolveChannel(message.guild, args[0]);
        if (possibleChannel && possibleChannel.type === ChannelType.GuildVoice) {
            channel = possibleChannel;
            newName = args.slice(1).join(' ');
        } else {
            channel = message.member?.voice?.channel;
            newName = args.join(' ');
        }

        if (!channel || channel.type !== ChannelType.GuildVoice) {
            return message.reply({ embeds: [errorEmbed('Salon vocal introuvable.')] });
        }

        if (!newName || newName.length === 0 || newName.length > 100) {
            return message.reply({ embeds: [errorEmbed('Le nom doit contenir entre 1 et 100 caractères.')] });
        }

        const oldName = channel.name;

        try {
            await channel.setName(newName);
            await message.reply({
                embeds: [
                    successEmbed(`Salon renommé : **${oldName}** → **${newName}**`),
                ],
            });

            await auditAndNotify(message.guild, message.author.id, 'RENAME_VC', {
                channelId: channel.id, oldName, newName,
            });
        } catch (err) {
            return message.reply({ embeds: [errorEmbed(`Impossible de renommer : ${err.message}`)] });
        }
    },
};
