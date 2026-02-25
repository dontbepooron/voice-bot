'use strict';

const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.resolve(__dirname, '../data/test_owner.sqlite');

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
        path: './data/test_owner.sqlite',
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
const ownerService = require('../src/services/ownerService');

describe('Owner Service', () => {
    const GUILD_ID = 'testGuild123';
    const SUPREME_ID = '999999999999999999';
    const USER_A = '111111111111111111';
    const USER_B = '222222222222222222';
    const ACTOR_ID = '333333333333333333';

    beforeAll(() => {
        db.init();
    });

    afterAll(() => {
        db.close();
        if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    });

    describe('isOwner', () => {
        test('le supreme owner devrait toujours être owner', () => {
            expect(ownerService.isOwner(GUILD_ID, SUPREME_ID)).toBe(true);
        });

        test('un utilisateur non enregistré ne devrait pas être owner', () => {
            expect(ownerService.isOwner(GUILD_ID, 'unknownUser')).toBe(false);
        });
    });

    describe('addOwner', () => {
        test('devrait ajouter un owner avec succès', () => {
            const result = ownerService.addOwner(GUILD_ID, USER_A, ACTOR_ID);
            expect(result.success).toBe(true);
        });

        test("l'utilisateur ajouté devrait être owner", () => {
            expect(ownerService.isOwner(GUILD_ID, USER_A)).toBe(true);
        });

        test('devrait refuser un doublon', () => {
            const result = ownerService.addOwner(GUILD_ID, USER_A, ACTOR_ID);
            expect(result.success).toBe(false);
            expect(result.reason).toContain('déjà owner');
        });

        test("devrait créer un audit log lors de l'ajout", () => {
            const log = db.get(
                "SELECT * FROM audit_logs WHERE guildId = ? AND action = 'OWNER_ADD'",
                GUILD_ID
            );
            expect(log).toBeDefined();
            expect(log.actorId).toBe(ACTOR_ID);
            const payload = JSON.parse(log.payload);
            expect(payload.targetId).toBe(USER_A);
        });
    });

    describe('removeOwner', () => {
        beforeAll(() => {
            // S'assurer que USER_B est owner
            ownerService.addOwner(GUILD_ID, USER_B, ACTOR_ID);
        });

        test('devrait retirer un owner avec succès', () => {
            const result = ownerService.removeOwner(GUILD_ID, USER_B, ACTOR_ID);
            expect(result.success).toBe(true);
        });

        test("l'utilisateur retiré ne devrait plus être owner", () => {
            expect(ownerService.isOwner(GUILD_ID, USER_B)).toBe(false);
        });

        test('devrait refuser de retirer le supreme owner', () => {
            const result = ownerService.removeOwner(GUILD_ID, SUPREME_ID, ACTOR_ID);
            expect(result.success).toBe(false);
            expect(result.reason).toContain('Supreme Owner');
        });

        test("devrait échouer si l'utilisateur n'est pas owner", () => {
            const result = ownerService.removeOwner(GUILD_ID, 'nonexistent', ACTOR_ID);
            expect(result.success).toBe(false);
            expect(result.reason).toContain("n'est pas owner");
        });
    });

    describe('listOwners', () => {
        test('devrait lister les owners de la guilde', () => {
            const list = ownerService.listOwners(GUILD_ID);
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);

            // USER_A devrait toujours être dans la liste
            const userA = list.find(o => o.userId === USER_A);
            expect(userA).toBeDefined();
            expect(userA.addedAt).toBeDefined();
        });

        test('devrait retourner un tableau vide pour une guilde sans owners', () => {
            const list = ownerService.listOwners('emptyGuild');
            expect(list).toEqual([]);
        });
    });
});
