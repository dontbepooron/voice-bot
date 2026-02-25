'use strict';

const path = require('path');
const fs = require('fs');

// Utiliser une DB temporaire pour les tests
const TEST_DB_PATH = path.resolve(__dirname, '../data/test_db.sqlite');

// Nettoyage avant tests
beforeAll(() => {
    const dir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

// Mock de config.json
jest.mock('../config.json', () => ({
    token: 'TEST_TOKEN',
    prefix: '=',
    embedColor: '#36393e',
    emojiPositive: '✅',
    emojiNegative: '❌',
    supremeOwnerId: '999999999999999999',
    defaultLanguage: 'fr',
    database: {
        type: 'better-sqlite3',
        path: './data/test_db.sqlite',
        pragma: {
            journal_mode: 'WAL',
            synchronous: 'NORMAL',
        },
    },
    loggingChannelId: null,
    performance: {
        useDbWorker: false,
        cacheTtlSeconds: 5,
    },
}));

const db = require('../src/services/database');

describe('Database Service', () => {
    beforeAll(() => {
        db.init();
    });

    afterAll(() => {
        db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    test('devrait initialiser la base de données', () => {
        const instance = db.getDb();
        expect(instance).toBeDefined();
        expect(instance.open).toBe(true);
    });

    test('les tables owners et audit_logs doivent exister', () => {
        const tables = db.all(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        );
        const names = tables.map(t => t.name);
        expect(names).toContain('owners');
        expect(names).toContain('audit_logs');
        expect(names).toContain('guild_config');
    });

    test('devrait insérer et lire des données dans owners', () => {
        db.run(
            'INSERT INTO owners (guildId, userId, addedAt) VALUES (?, ?, ?)',
            'guild1', 'user1', Date.now()
        );

        const row = db.get('SELECT * FROM owners WHERE guildId = ? AND userId = ?', 'guild1', 'user1');
        expect(row).toBeDefined();
        expect(row.guildId).toBe('guild1');
        expect(row.userId).toBe('user1');
    });

    test('devrait supporter les transactions', () => {
        const insertTwo = db.transaction(() => {
            db.run('INSERT INTO owners (guildId, userId, addedAt) VALUES (?, ?, ?)', 'guild2', 'userA', Date.now());
            db.run('INSERT INTO owners (guildId, userId, addedAt) VALUES (?, ?, ?)', 'guild2', 'userB', Date.now());
        });

        insertTwo();
        const rows = db.all('SELECT * FROM owners WHERE guildId = ?', 'guild2');
        expect(rows.length).toBe(2);
    });

    test('devrait insérer dans audit_logs', () => {
        db.run(
            'INSERT INTO audit_logs (guildId, actorId, action, payload, timestamp) VALUES (?, ?, ?, ?, ?)',
            'guild1', 'actor1', 'TEST_ACTION', JSON.stringify({ test: true }), Date.now()
        );

        const row = db.get('SELECT * FROM audit_logs WHERE action = ?', 'TEST_ACTION');
        expect(row).toBeDefined();
        expect(row.actorId).toBe('actor1');
        expect(JSON.parse(row.payload).test).toBe(true);
    });
});
