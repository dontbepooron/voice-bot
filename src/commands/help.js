'use strict';

const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const { ownerOnly } = require('../middleware/ownerOnly');
const { infoEmbed, errorEmbed } = require('../utils/embed');
const { commands } = require('../handlers/commandHandler');
const config = require('../../config.json');

// ─── Définition des catégories ──────────────────────────────
const CATEGORIES = {
    owners: {
        emoji: '👑',
        label: 'Gestion Owners',
        description: 'Ajouter, retirer et lister les owners',
        commands: ['owner', 'ownerlist', 'unowner'],
    },
    search: {
        emoji: '🔍',
        label: 'Recherche & Info',
        description: 'Localiser, inspecter et analyser',
        commands: ['find', 'vcinfo', 'whois', 'voicelog', 'activity'],
    },
    bot_voice: {
        emoji: '🔊',
        label: 'Connexion Bot',
        description: 'Rejoindre ou quitter un salon vocal',
        commands: ['join', 'leave'],
    },
    movement: {
        emoji: '🔀',
        label: 'Déplacement',
        description: 'Move, swap, drag et mass-move',
        commands: ['move', 'force-move', 'swap', 'massmove', 'drag'],
    },
    mass: {
        emoji: '⚡',
        label: 'Actions de masse',
        description: 'Mute, deaf et disconnect en masse',
        commands: ['massmute', 'massunmute', 'massdeaf', 'massundeaf', 'massdisconnect'],
    },
    channel: {
        emoji: '🎙️',
        label: 'Gestion Salon',
        description: 'Créer, configurer et gérer les salons vocaux',
        commands: ['createvc', 'lockvc', 'unlockvc', 'hidevc', 'showvc', 'limit', 'rename', 'bitrate', 'region'],
    },
    moderation: {
        emoji: '🛡️',
        label: 'Modération',
        description: 'Mute, deaf, disconnect individuel',
        commands: ['mute', 'unmute', 'deaf', 'undeaf', 'disconnect'],
    },
    permissions: {
        emoji: '🔐',
        label: 'Permissions',
        description: 'Autoriser ou bloquer l\'accès aux salons',
        commands: ['permit', 'reject'],
    },
    interactive: {
        emoji: '🎛️',
        label: 'Interactif',
        description: 'Panneau de contrôle et invitations',
        commands: ['vcpanel', 'invite-to-voice'],
    },
    audit: {
        emoji: '📋',
        label: 'Audit & Logs',
        description: 'Consulter les logs d\'audit',
        commands: ['audit'],
    },
    utility: {
        emoji: '🔧',
        label: 'Utilitaires',
        description: 'Ping, uptime, préfixe, config',
        commands: ['help', 'ping', 'uptime', 'prefix', 'config'],
    },
    optional: {
        emoji: '🔴',
        label: 'Optionnel',
        description: 'Fonctionnalités expérimentales',
        commands: ['rtc-record'],
    },
};

module.exports = {
    name: 'help',
    aliases: ['h', 'commands', 'cmds'],
    description: 'Menu d\'aide interactif avec navigation par catégorie.',
    usage: '=help [commande]',

    async run(message, args) {
        if (!(await ownerOnly(message))) return;

        // ── Mode doc rapide pour une commande spécifique ──
        if (args[0]) {
            return sendCommandDoc(message, args[0].toLowerCase());
        }

        // ── Mode interactif : menu principal ──
        const { embed, selectRow, buttonRow } = buildMainMenu();

        const helpMsg = await message.reply({
            embeds: [embed],
            components: [selectRow, buttonRow],
        });

        // ── Collector : 3 minutes ──
        const collector = helpMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 180_000,
        });

        collector.on('collect', async (interaction) => {
            try {
                // Bouton "Accueil"
                if (interaction.customId === 'help_home') {
                    const { embed, selectRow, buttonRow } = buildMainMenu();
                    return interaction.update({ embeds: [embed], components: [selectRow, buttonRow] });
                }

                // Bouton "Fermer"
                if (interaction.customId === 'help_close') {
                    collector.stop('closed');
                    return interaction.update({
                        embeds: [infoEmbed('👋 Menu d\'aide fermé', [], '*Utilisez `=help` pour le rouvrir.*')],
                        components: [],
                    });
                }

                // Select menu : catégorie
                if (interaction.customId === 'help_category') {
                    const categoryKey = interaction.values[0];

                    // Sélection d'une commande spécifique
                    if (categoryKey.startsWith('cmd:')) {
                        const cmdName = categoryKey.slice(4);
                        const embed = buildCommandEmbed(cmdName);
                        const backRow = buildBackRow();
                        return interaction.update({ embeds: [embed], components: [backRow] });
                    }

                    // Sélection d'une catégorie
                    const { embed, selectRow, buttonRow } = buildCategoryView(categoryKey);
                    return interaction.update({ embeds: [embed], components: [selectRow, buttonRow] });
                }
            } catch (err) {
                console.error('[Help] Interaction error:', err);
            }
        });

        collector.on('end', async (_, reason) => {
            if (reason === 'closed') return;
            try {
                await helpMsg.edit({ components: [] });
            } catch { }
        });
    },
};

// ─── Builders ───────────────────────────────────────────────

function buildMainMenu() {
    const totalCommands = commands.size;

    const embed = infoEmbed(
        '🎙️ Voice Bot — Centre d\'aide',
        [
            {
                name: '📊 Statistiques',
                value: `\`${totalCommands}\` commandes • \`${Object.keys(CATEGORIES).length}\` catégories`,
                inline: true,
            },
            {
                name: '🔧 Préfixe actuel',
                value: `\`${config.prefix}\``,
                inline: true,
            },
            {
                name: '💡 Astuce',
                value: '`=help <commande>` pour la doc rapide d\'une commande',
                inline: true,
            },
        ],
        '**Sélectionnez une catégorie** dans le menu ci-dessous pour explorer les commandes.\n\n'
        + Object.entries(CATEGORIES).map(([, cat]) => `${cat.emoji} **${cat.label}** — ${cat.description}`).join('\n')
    );

    embed.setFooter({ text: 'Développé par dvm #🇵🇸 • Menu interactif • Expire dans 3 min' });

    const select = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('📂 Choisir une catégorie...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            Object.entries(CATEGORIES).map(([key, cat]) => ({
                label: cat.label,
                description: `${cat.commands.length} commande(s) — ${cat.description}`,
                value: key,
                emoji: cat.emoji,
            }))
        );

    const selectRow = new ActionRowBuilder().addComponents(select);
    const buttonRow = buildNavigationButtons(false);

    return { embed, selectRow, buttonRow };
}

function buildCategoryView(categoryKey) {
    const cat = CATEGORIES[categoryKey];
    if (!cat) return buildMainMenu();

    const cmdList = cat.commands
        .map(name => {
            const cmd = commands.get(name);
            if (!cmd) return null;
            return `> **\`${config.prefix}${cmd.name}\`**\n> ${cmd.description || 'Pas de description'}\n> Syntaxe : \`${cmd.usage || '—'}\`${cmd.aliases?.length ? `\n> Alias : ${cmd.aliases.map(a => `\`${a}\``).join(', ')}` : ''}`;
        })
        .filter(Boolean)
        .join('\n\n');

    const embed = infoEmbed(
        `${cat.emoji} ${cat.label}`,
        [],
        cmdList || '*Aucune commande dans cette catégorie.*'
    );

    embed.setFooter({ text: `${cat.commands.length} commande(s) • Sélectionnez une commande pour plus de détails` });

    // Select menu avec les commandes de la catégorie
    const cmdOptions = cat.commands
        .map(name => {
            const cmd = commands.get(name);
            if (!cmd) return null;
            return {
                label: `${config.prefix}${cmd.name}`,
                description: (cmd.description || 'Pas de description').substring(0, 100),
                value: `cmd:${cmd.name}`,
            };
        })
        .filter(Boolean);

    // Ajouter option pour revenir au menu
    cmdOptions.unshift({
        label: '↩️ Retour aux catégories',
        description: 'Revenir au menu principal',
        value: 'home_return',
        emoji: '🏠',
    });

    const select = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder(`🔎 Explorer les commandes ${cat.label}...`)
        .setMinValues(1)
        .setMaxValues(1);

    // Remapper "home_return" pour revenir au menu
    const finalOptions = cmdOptions.map(opt => {
        if (opt.value === 'home_return') {
            // On va gérer ça côté collector
            return { ...opt, value: '__home__' };
        }
        return opt;
    });

    select.addOptions(finalOptions);

    const selectRow = new ActionRowBuilder().addComponents(select);
    const buttonRow = buildNavigationButtons(true);

    return { embed, selectRow, buttonRow };
}

function buildCommandEmbed(cmdName) {
    const cmd = commands.get(cmdName);
    if (!cmd) {
        return errorEmbed(`Commande \`${cmdName}\` introuvable.`);
    }

    // Trouver la catégorie
    let categoryLabel = 'Inconnue';
    let categoryEmoji = '❓';
    for (const [, cat] of Object.entries(CATEGORIES)) {
        if (cat.commands.includes(cmd.name)) {
            categoryLabel = cat.label;
            categoryEmoji = cat.emoji;
            break;
        }
    }

    return infoEmbed(`📖 ${config.prefix}${cmd.name}`, [
        { name: '📝 Description', value: cmd.description || 'Aucune', inline: false },
        { name: '💻 Syntaxe', value: `\`${cmd.usage || 'Non définie'}\``, inline: false },
        { name: '🏷️ Alias', value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${config.prefix}${a}\``).join(', ') : '*Aucun*', inline: true },
        { name: `${categoryEmoji} Catégorie`, value: categoryLabel, inline: true },
        { name: '🔒 Permission', value: 'Owner-only', inline: true },
    ]);
}

function buildNavigationButtons(showHome) {
    const buttons = [];

    if (showHome) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('help_home')
                .setLabel('🏠 Accueil')
                .setStyle(ButtonStyle.Primary)
        );
    }

    buttons.push(
        new ButtonBuilder()
            .setCustomId('help_close')
            .setLabel('✖ Fermer')
            .setStyle(ButtonStyle.Danger)
    );

    return new ActionRowBuilder().addComponents(buttons);
}

function buildBackRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_home')
            .setLabel('🏠 Accueil')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('help_close')
            .setLabel('✖ Fermer')
            .setStyle(ButtonStyle.Danger)
    );
}

// ─── Doc rapide (=help <cmd>) ───────────────────────────────
async function sendCommandDoc(message, cmdName) {
    const cmd = commands.get(cmdName);
    if (!cmd) {
        return message.reply({ embeds: [errorEmbed(`Commande \`${cmdName}\` introuvable. Tapez \`=help\` pour le menu interactif.`)] });
    }

    const embed = buildCommandEmbed(cmdName);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_home')
            .setLabel('📂 Voir toutes les commandes')
            .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 60_000,
        max: 1,
    });

    collector.on('collect', async (interaction) => {
        const { embed, selectRow, buttonRow } = buildMainMenu();
        await interaction.update({ embeds: [embed], components: [selectRow, buttonRow] });

        // Ouvrir un nouveau collector pour le menu complet
        const fullCollector = msg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 180_000,
        });

        fullCollector.on('collect', async (i) => {
            try {
                if (i.customId === 'help_home') {
                    const { embed, selectRow, buttonRow } = buildMainMenu();
                    return i.update({ embeds: [embed], components: [selectRow, buttonRow] });
                }
                if (i.customId === 'help_close') {
                    fullCollector.stop('closed');
                    return i.update({
                        embeds: [infoEmbed('👋 Menu fermé', [], '*`=help` pour rouvrir.*')],
                        components: [],
                    });
                }
                if (i.customId === 'help_category') {
                    const val = i.values[0];
                    if (val === '__home__') {
                        const { embed, selectRow, buttonRow } = buildMainMenu();
                        return i.update({ embeds: [embed], components: [selectRow, buttonRow] });
                    }
                    if (val.startsWith('cmd:')) {
                        const embed = buildCommandEmbed(val.slice(4));
                        return i.update({ embeds: [embed], components: [buildBackRow()] });
                    }
                    const { embed, selectRow, buttonRow } = buildCategoryView(val);
                    return i.update({ embeds: [embed], components: [selectRow, buttonRow] });
                }
            } catch (err) {
                console.error('[Help] error:', err);
            }
        });

        fullCollector.on('end', async (_, reason) => {
            if (reason === 'closed') return;
            try { await msg.edit({ components: [] }); } catch { }
        });
    });

    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            try { await msg.edit({ components: [] }); } catch { }
        }
    });
}
