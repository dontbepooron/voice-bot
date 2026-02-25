'use strict';

const voiceService = require('../src/services/voiceService');

// ── Mocks Discord.js ────────────────────────────────────────

function createMockChannel(id, name, members = [], userLimit = 0) {
    const membersMap = new Map();
    members.forEach(m => membersMap.set(m.id, m));

    return {
        id,
        name,
        members: {
            size: membersMap.size,
            values: () => membersMap.values(),
            get: (mid) => membersMap.get(mid),
        },
        userLimit,
        bitrate: 64000,
        guild: {
            id: 'guild1',
            members: { me: { id: 'botId' } },
            voiceAdapterCreator: {},
        },
        permissionsFor: () => ({
            has: () => true,
        }),
    };
}

function createMockMember(id, channelId = null, channelName = 'General') {
    const channel = channelId
        ? createMockChannel(channelId, channelName)
        : null;

    let currentChannel = channel;

    return {
        id,
        voice: {
            get channel() { return currentChannel; },
            setChannel: jest.fn(async (targetChannel) => {
                currentChannel = targetChannel;
            }),
        },
    };
}

// Mock @discordjs/voice
jest.mock('@discordjs/voice', () => ({
    joinVoiceChannel: jest.fn(() => ({ destroy: jest.fn() })),
    getVoiceConnection: jest.fn(() => null),
}));

// Mock permissions
jest.mock('../src/utils/permissions', () => ({
    checkChannelPermissions: jest.fn(() => ({ ok: true, missing: [] })),
    checkBotPermissions: jest.fn(() => ({ ok: true, missing: [] })),
}));

describe('Voice Service', () => {
    describe('performMove', () => {
        test('devrait déplacer un membre avec succès', async () => {
            const member = createMockMember('user1', 'ch1', 'Source');
            const targetChannel = createMockChannel('ch2', 'Destination');

            const result = await voiceService.performMove(member, targetChannel);

            expect(result.success).toBe(true);
            expect(member.voice.setChannel).toHaveBeenCalledWith(targetChannel);
        });

        test("devrait échouer si le membre n'est pas en vocal", async () => {
            const member = createMockMember('user2', null);
            const targetChannel = createMockChannel('ch2', 'Destination');

            const result = await voiceService.performMove(member, targetChannel);

            expect(result.success).toBe(false);
            expect(result.reason).toContain("n'est pas connecté");
        });

        test('devrait échouer si le salon est plein', async () => {
            const member = createMockMember('user3', 'ch1', 'Source');
            const fullChannel = createMockChannel('ch3', 'Full', [
                { id: 'a' }, { id: 'b' },
            ], 2);

            const result = await voiceService.performMove(member, fullChannel);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('plein');
        });
    });

    describe('performSwap', () => {
        test("devrait échouer si un membre n'est pas en vocal", async () => {
            const memberA = createMockMember('userA', 'ch1', 'Salon A');
            const memberB = createMockMember('userB', null);

            const result = await voiceService.performSwap(memberA, memberB);

            expect(result.success).toBe(false);
            expect(result.reason).toContain("n'est pas connecté");
        });

        test('devrait échouer si les deux sont dans le même salon', async () => {
            const memberA = createMockMember('userA', 'ch1', 'Salon');
            const memberB = createMockMember('userB', 'ch1', 'Salon');

            const result = await voiceService.performSwap(memberA, memberB);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('même salon');
        });
    });

    describe('botLeaveChannel', () => {
        test("devrait échouer si le bot n'est pas connecté", () => {
            const { getVoiceConnection } = require('@discordjs/voice');
            getVoiceConnection.mockReturnValue(null);

            const result = voiceService.botLeaveChannel({ id: 'guild1' });

            expect(result.success).toBe(false);
            expect(result.reason).toContain("n'est pas connecté");
        });

        test('devrait déconnecter le bot avec succès', () => {
            const { getVoiceConnection } = require('@discordjs/voice');
            const mockConnection = { destroy: jest.fn() };
            getVoiceConnection.mockReturnValue(mockConnection);

            const result = voiceService.botLeaveChannel({ id: 'guild1' });

            expect(result.success).toBe(true);
            expect(mockConnection.destroy).toHaveBeenCalled();
        });
    });
});
