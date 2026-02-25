<p align="center">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/license-UNLICENSED-red?style=for-the-badge" />
</p>

<h1 align="center">🎙️ Voice Bot</h1>

<p align="center">
  <b>Le bot Discord ultime de gestion vocale et d'administration.</b><br>
  <i>Rapide · Sécurisé · Modulaire · 42+ commandes</i>
</p>

<p align="center">
  <sub>Développé avec ❤️ par <b>dvm #🇵🇸</b></sub>
</p>

---

## ✨ Fonctionnalités

| Catégorie | Fonctionnalités |
|---|---|
| **🔀 Déplacement** | Move, force-move, swap, massmove, drag — logique DRY centralisée |
| **⚡ Actions de masse** | Massmute, massunmute, massdeaf, massundeaf, massdisconnect |
| **🎙️ Gestion de salon** | Créer, verrouiller, cacher, renommer, bitrate, limite, région |
| **🛡️ Modération** | Mute, deaf, disconnect avec protection du Supreme Owner |
| **🔐 Permissions** | Permit/reject par utilisateur ou rôle sur un salon spécifique |
| **🎛️ Panneau interactif** | `=vcpanel` — contrôle complet avec boutons (lock, mute all, DC all) |
| **📊 Analytics vocal** | Tracking automatique, leaderboard, historique par utilisateur |
| **👑 Système d'ownership** | Supreme owner + owners par guilde, audit complet |
| **📋 Audit détaillé** | Chaque action loguée en DB + embeds dans le salon de logs |

---

## 🚀 Installation

### Prérequis

- [Node.js](https://nodejs.org/) **v18+** (LTS recommandé)
- Un bot Discord avec les [intents privilégiés](https://discord.com/developers) activés :
  - ✅ Server Members Intent
  - ✅ Message Content Intent

### Étapes

```bash
# 1. Cloner le projet
git clone <votre-repo>
cd Voice\ Bot

# 2. Installer les dépendances
npm install

# 3. Configurer le bot
#    Éditer config.json avec votre token et votre ID Discord

# 4. Lancer le bot
npm start
```

---

## ⚙️ Configuration

Éditer `config.json` à la racine :

```json
{
  "token": "VOTRE_TOKEN_ICI",
  "prefix": "=",
  "embedColor": "#36393e",
  "emojiPositive": "✅",
  "emojiNegative": "❌",
  "supremeOwnerId": "VOTRE_ID_DISCORD",
  "loggingChannelId": null,
  "database": {
    "path": "./data/db.sqlite",
    "pragma": { "journal_mode": "WAL", "synchronous": "NORMAL" }
  },
  "performance": {
    "useDbWorker": true,
    "cacheTtlSeconds": 5
  }
}
```

| Clé | Description |
|---|---|
| `token` | Token du bot Discord |
| `prefix` | Préfixe par défaut (`=`), modifiable par guilde via `=prefix set` |
| `embedColor` | Couleur des embeds (`#36393e`) |
| `supremeOwnerId` | ID du propriétaire suprême — immunisé, plein accès |
| `loggingChannelId` | ID du salon pour les embeds d'audit (optionnel) |

---

## 📋 Commandes (42+)

> Toutes les commandes sont **owner-only**. Utilisez `=help` pour la liste complète.

### 👑 Gestion Owners

| Commande | Description |
|---|---|
| `=owner add @user` | Ajouter un owner |
| `=owner remove @user` | Retirer un owner |
| `=owner list` | Lister les owners |
| `=ownerlist` | Alias de `=owner list` |
| `=unowner @user` | Alias de `=owner remove` |

### 🔍 Recherche & Info

| Commande | Description |
|---|---|
| `=find @user` | Localiser un utilisateur en vocal |
| `=vcinfo [#salon\|@user]` | Infos complètes d'un salon vocal |
| `=whois @user` | Fiche détaillée d'un utilisateur |
| `=voicelog @user` | Historique des sessions vocales |
| `=activity` | Classement d'activité vocale (7 jours) |

### 🔀 Déplacement

| Commande | Description |
|---|---|
| `=move @user [#salon]` | Déplacer un utilisateur |
| `=force-move @user #salon` | Déplacement forcé avec raison |
| `=swap @a @b` | Échanger deux utilisateurs |
| `=massmove #from #to` | Déplacer tout un salon |
| `=drag @user` | Tirer vers votre salon |

### ⚡ Actions de masse

| Commande | Description |
|---|---|
| `=massmute [#salon]` | Mute tout un salon |
| `=massunmute [#salon]` | Unmute tout un salon |
| `=massdeaf [#salon]` | Deafen tout un salon |
| `=massundeaf [#salon]` | Undeafen tout un salon |
| `=massdisconnect [#salon]` | Déconnecter tout un salon |

### 🎙️ Gestion de salon

| Commande | Description |
|---|---|
| `=createvc "nom" [limit] [temp:true]` | Créer un salon vocal |
| `=lockvc [#salon]` | Verrouiller un salon |
| `=unlockvc [#salon]` | Déverrouiller un salon |
| `=hidevc [#salon]` | Cacher un salon |
| `=showvc [#salon]` | Rendre visible un salon |
| `=limit [#salon] <n>` | Changer la limite d'utilisateurs |
| `=rename [#salon] <nom>` | Renommer un salon |
| `=bitrate [#salon] <kbps>` | Changer le bitrate |
| `=region [#salon] <region>` | Changer la région RTC |

### 🛡️ Modération vocale

| Commande | Description |
|---|---|
| `=mute @user` | Server mute |
| `=unmute @user` | Retirer le mute |
| `=deaf @user` | Server deafen |
| `=undeaf @user` | Retirer le deafen |
| `=disconnect @user` | Déconnecter du vocal |

### 🔐 Permissions

| Commande | Description |
|---|---|
| `=permit @role\|@user [#salon]` | Autoriser l'accès |
| `=reject @user [#salon]` | Bloquer l'accès |

### 🎛️ Interactif

| Commande | Description |
|---|---|
| `=vcpanel` | Panneau de contrôle avec boutons |
| `=invite-to-voice @user` | Invitation interactive |

### 🔧 Utilitaires

| Commande | Description |
|---|---|
| `=help [cmd]` | Liste des commandes |
| `=ping` | Latence du bot |
| `=uptime` | Temps d'activité |
| `=prefix set <p>` | Changer le préfixe |
| `=config view\|set` | Configuration de la guilde |
| `=audit [n]` | Voir les derniers audit logs |

---

## 🏗️ Architecture

```
src/
├── index.js                 # Point d'entrée, événements, cooldown, présence
├── commands/                # 42+ fichiers de commandes
├── handlers/
│   └── commandHandler.js    # Routeur de commandes avec alias
├── middleware/
│   └── ownerOnly.js         # Gate owner-only + supreme owner
├── migrations/
│   └── 001_init.sql         # Schéma initial
├── services/
│   ├── database.js          # Wrapper better-sqlite3 (WAL, transactions)
│   ├── auditService.js      # Audit DB + embeds
│   ├── ownerService.js      # CRUD owners + cache TTL
│   ├── voiceService.js      # performMove réutilisé par 5 commandes
│   └── voiceTracker.js      # Tracking d'activité vocale
└── utils/
    ├── cache.js             # Cache TTL en mémoire
    ├── embed.js             # Constructeurs d'embeds
    ├── permissions.js       # Vérifications de permissions
    └── resolvers.js         # Résolution user/channel
```

### Principes de conception

- **DRY** — `performMove()` est réutilisé par `move`, `swap`, `massmove`, `force-move`, `drag`
- **Sécurité** — Supreme owner vérifié en premier, avant tout accès DB
- **Performance** — Cache TTL sur les lookups owners, WAL mode SQLite
- **Audit complet** — Chaque action loguée en DB avec payload JSON
- **Cooldown** — 2 secondes entre chaque commande pour éviter le spam
- **Rich Presence** — Statut dynamique affichant les salons vocaux actifs

---

## 🗄️ Base de données

| Table | Description |
|---|---|
| `owners` | Owners par guilde (guildId, userId, addedAt) |
| `audit_logs` | Logs d'audit avec payload JSON |
| `guild_config` | Préfixe et config par guilde |
| `voice_sessions` | Historique des sessions vocales |

SQLite avec **WAL mode** pour des performances optimales en lecture/écriture concurrente.

---

## 🧪 Tests

```bash
# Lancer les tests unitaires
npm test

# 24 tests couvrant :
# ✅ Database Service (init, migrations, CRUD, transactions)
# ✅ Owner Service (isOwner, addOwner, removeOwner, supreme immunity)
# ✅ Voice Service (performMove, performSwap, botLeave)
```

---

## 🔒 Sécurité

- **Supreme Owner** (`supremeOwnerId`) : accès total, impossible à retirer, immunisé contre mute/deaf/disconnect
- **Middleware owner-only** : vérifie chaque commande, logue les tentatives non autorisées
- **Prepared statements** : protection contre l'injection SQL
- **Transactions atomiques** : cohérence des opérations DB (ajout owner + audit log)

---

## 📜 Licence

Projet privé — Tous droits réservés.

---

<p align="center">
  <b>Voice Bot</b> — Le contrôle vocal absolu.<br>
  <sub>Fait par <b>dvm #🇵🇸</b> avec ☕ et 🎙️</sub>
</p>
