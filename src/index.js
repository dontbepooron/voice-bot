'use strict';

const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const config = require('../config.json');
const db = require('./services/database');
const { loadCommands, handleCommand } = require('./handlers/commandHandler');
const { initVoiceTracking, trackJoin, trackLeave } = require('./services/voiceTracker');

// ─── Client Discord ─────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel],
});

// ─── Cooldown ───────────────────────────────────────────────
const cooldowns = new Map();
const COOLDOWN_MS = 2000; // 2 secondes entre chaque commande

function checkCooldown(userId) {
    const last = cooldowns.get(userId);
    const now = Date.now();
    if (last && now - last < COOLDOWN_MS) {
        return Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    }
    cooldowns.set(userId, now);
    return 0;
}

// ─── Ready ──────────────────────────────────────────────────
client.once('clientReady', () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log(`║  🎙️  Voice Bot — by dvm #🇵🇸             ║`);
    console.log(`║  Connecté : ${client.user.tag.padEnd(28)}║`);
    console.log(`║  Guildes  : ${String(client.guilds.cache.size).padEnd(28)}║`);
    console.log('╚══════════════════════════════════════════╝');

    // Initialiser la base de données
    db.init();
    console.log('[DB] Base de données initialisée avec WAL.');

    // Initialiser le tracking vocal
    initVoiceTracking();
    console.log('[Tracker] Suivi vocal activé.');

    // Charger les commandes
    loadCommands();

    // Rich Presence
    updatePresence();
    setInterval(updatePresence, 60_000);
});

function updatePresence() {
    const guilds = client.guilds.cache.size;
    const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const voiceConnections = client.guilds.cache.reduce((acc, g) => {
        return acc + g.channels.cache.filter(c => c.isVoiceBased() && c.members.size > 0).size;
    }, 0);

    client.user.setPresence({
        activities: [{
            name: `${voiceConnections} salons vocaux | ${guilds} serveurs`,
            type: ActivityType.Watching,
        }],
        status: 'dnd',
    });
}

// ─── Message Handler ────────────────────────────────────────
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Vérifier cooldown
    const remaining = checkCooldown(message.author.id);
    if (remaining > 0 && message.content.startsWith(config.prefix)) {
        // Ignorer silencieusement les commandes en cooldown
        return;
    }

    try {
        await handleCommand(message);
    } catch (err) {
        console.error('[Error] messageCreate:', err);
    }
});

// ─── Voice State Update ─────────────────────────────────────
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const guildId = newState.guild.id || oldState.guild.id;
        const userId = newState.id || oldState.id;

        // ── Tracking vocal ──
        // Utilisateur a rejoint un salon
        if (!oldState.channel && newState.channel) {
            trackJoin(guildId, userId, newState.channel.id, newState.channel.name);
        }
        // Utilisateur a quitté un salon
        else if (oldState.channel && !newState.channel) {
            trackLeave(guildId, userId);
        }
        // Utilisateur a changé de salon
        else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
            trackLeave(guildId, userId);
            trackJoin(guildId, userId, newState.channel.id, newState.channel.name);
        }

        // ── Nettoyage des salons temporaires ──
        if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel?.id)) {
            const channel = oldState.channel;
            const { tempChannels } = require('./commands/createvc');
            if (tempChannels.has(channel.id) && channel.members.size === 0) {
                try {
                    await channel.delete('Salon temporaire vide — auto-suppression');
                    tempChannels.delete(channel.id);
                    console.log(`[TempVC] Salon "${channel.name}" supprimé automatiquement.`);
                } catch (err) {
                    console.error(`[TempVC] Échec suppression:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error('[Error] voiceStateUpdate:', err);
    }
});

// ─── Gestion des erreurs ────────────────────────────────────
process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]', err);
});

process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
});

// ─── Arrêt propre ───────────────────────────────────────────
function gracefulShutdown(signal) {
    console.log(`\n[Bot] ${signal} reçu — arrêt propre...`);
    db.close();
    client.destroy();
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Connexion ──────────────────────────────────────────────
client.login(config.token).catch((err) => {
    console.error('[Bot] Impossible de se connecter :', err.message);
    process.exit(1);
});
