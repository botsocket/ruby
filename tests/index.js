'use strict';

const Bone = require('@botsocket/bone');

const Ruby = require('../src');

describe('registry()', () => {

    describe('add()', () => {

        it('should throw if content arguments are not placed last', () => {

            const registry = Ruby.registry();

            expect(() => {

                registry.add({
                    name: 'ban',
                    args: [{ name: 'reason', match: 'content' }, 'member'],
                });
            }).toThrow('Argument "reason" must be defined last because it is matching content');
        });
    });

    describe('definitions', () => {

        it('should return all the definitions', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'simple',
            }, {
                name: 'complex',
                args: ['arg1', 'arg2'],
            });

            const definitions = [
                { name: 'simple' },
                { name: 'complex', args: [{ name: 'arg1' }, { name: 'arg2' }] },
            ];

            expect(Bone.equal(registry.definitions, definitions)).toBe(true);
        });
    });

    describe('match()', () => {

        it('should return null for mismatching prefixes', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' });

            expect(registry.match('?simple')).toBe(null);
        });

        it('should return null if definiton is not found', () => {

            const registry = Ruby.registry();
            expect(registry.match('!simple')).toBe(null);
        });

        it('should match simple commands', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' });

            const match = registry.match('!simple');
            const expected = [
                {
                    definition: { name: 'simple' },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should return data associated to a definition', () => {

            const data = { handler: () => { } };

            const registry = Ruby.registry();
            registry.add({ name: 'simple', data });

            const match = registry.match('!simple');
            const expected = [
                {
                    definition: { name: 'simple', data },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should return multiple matches', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' }, { name: 'simple', args: ['test'] });

            const match = registry.match('!simple');
            const expected = [
                {
                    definition: { name: 'simple' },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
                {
                    definition: { name: 'simple', args: [{ name: 'test' }] },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!simple test');
            const expected2 = [
                {
                    definition: { name: 'simple' },
                    args: {},
                    flags: {},
                    unknowns: [{ arg: 'test' }],
                },
                {
                    definition: { name: 'simple', args: [{ name: 'test' }] },
                    args: { test: 'test' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match2, expected2)).toBe(true);
        });

        it('should match simple commands with aliases', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple', alias: 'easy' });

            const match = registry.match('!simple');
            const expected = [
                {
                    definition: { name: 'simple', alias: ['easy'] },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!easy');
            expect(Bone.equal(match2, expected)).toBe(true);
        });

        it('should match simple commands with no argument definition', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban' });

            const match = registry.match('!ban member reason');
            const expected = [
                {
                    definition: { name: 'ban' },
                    args: {},
                    flags: {},
                    unknowns: [{ arg: 'member' }, { arg: 'reason' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with arguments', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member', 'reason'] });

            const match = registry.match('!ban member reason');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: 'reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with unknown arguments', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member'] });

            const match = registry.match('!ban member reason');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }] },
                    args: { member: 'member' },
                    flags: {},
                    unknowns: [{ arg: 'reason' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with literal arguments', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member', 'reason'] });

            const match = registry.match('!ban member "This is the reason"');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with literal arguments with mismatching/nested quotes', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member', 'reason'] });

            const match = registry.match('!ban member "This is the reason""');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: 'This is the reason"' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!ban member ""This is the reason"');
            const expected2 = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: '"This is the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match2, expected2)).toBe(true);

            const match3 = registry.match('!ban member ""This is the reason""');
            const expected3 = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: '"This is the reason"' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match3, expected3)).toBe(true);

            const match4 = registry.match('!ban m"ember" "reason"s');
            const expected4 = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'm"ember"', reason: '"reason"s' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match4, expected4)).toBe(true);
        });

        it('should match commands with content arguments', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', { name: 'reason', match: 'content' }],
            });

            const match = registry.match('!ban member This is the reason');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason', match: 'content' }] },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should reset regex before matching other definitions', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', { name: 'reason', match: 'content' }],
            }, {
                name: 'ban',
            });

            const match = registry.match('!ban member This is the reason');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason', match: 'content' }] },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
                },
                {
                    definition: { name: 'ban' },
                    args: {},
                    flags: {},
                    unknowns: [{ arg: 'member' }, { arg: 'This' }, { arg: 'is' }, { arg: 'the' }, { arg: 'reason' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with list arguments', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: [{ name: 'members', match: 'list' }, 'reason'],
            });

            const match = registry.match('!ban member1,member2,member3 reason');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [
                            { name: 'members', match: 'list', delimiter: ',' },
                            { name: 'reason' },
                        ],
                    },
                    args: { members: ['member1', 'member2', 'member3'], reason: 'reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: ['delay'],
            });

            const match = registry.match('!ban member --delay 10 "This is the reason"');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            delay: { name: 'delay' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { delay: '10' },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with unknown flags', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member', 'reason'] });

            const match = registry.match('!ban member --someUnknownFlag "This is the reason"');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [{ flag: 'someUnknownFlag' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with literal flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member'],
                flags: ['reason'],
            });

            const match = registry.match('!ban --reason "This is the reason" member');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }],
                        flags: {
                            reason: { name: 'reason' },
                        },
                    },
                    args: { member: 'member' },
                    flags: { reason: 'This is the reason' },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with content flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member'],
                flags: [{ name: 'reason', match: 'content' }],
            });

            const match = registry.match('!ban member --reason This is the reason');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }],
                        flags: {
                            reason: { name: 'reason', match: 'content' },
                        },
                    },
                    args: { member: 'member' },
                    flags: { reason: 'This is the reason' },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with list flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['reason'],
                flags: [{ name: 'members', match: 'list' }],
            });

            const match = registry.match('!ban --members member1,member2,member3 "This is the reason"');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'reason' }],
                        flags: {
                            members: { name: 'members', match: 'list', delimiter: ',' },
                        },
                    },
                    args: { reason: 'This is the reason' },
                    flags: { members: ['member1', 'member2', 'member3'] },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with implicit boolean flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: ['sendBanAppeal'],
            });

            const match = registry.match('!ban member "This is the reason" --sendBanAppeal');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            sendBanAppeal: { name: 'sendBanAppeal' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!ban member --sendBanAppeal --someUnknownFlag "This is the reason"');
            const expected2 = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            sendBanAppeal: { name: 'sendBanAppeal' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [{ flag: 'someUnknownFlag' }],
                },
            ];

            expect(Bone.equal(match2, expected2)).toBe(true);
        });

        it('should match commands with explicit boolean flags', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: [{ name: 'sendBanAppeal', match: 'boolean' }],
            });

            const match = registry.match('!ban member --sendBanAppeal "This is the reason"');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            sendBanAppeal: { name: 'sendBanAppeal', match: 'boolean' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should prioritize flags over content arguments', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', { name: 'reason', match: 'content' }],
                flags: [{ name: 'sendBanAppeal', match: 'boolean' }],
            });

            const match = registry.match('!ban member --sendBanAppeal This is the reason');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason', match: 'content' }],
                        flags: { sendBanAppeal: { name: 'sendBanAppeal', match: 'boolean' } },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!ban member This is --sendBanAppeal the reason');
            const expected2 = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason', match: 'content' }],
                        flags: { sendBanAppeal: { name: 'sendBanAppeal', match: 'boolean' } },
                    },
                    args: { member: 'member', reason: 'This is --sendBanAppeal the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match2, expected2)).toBe(true);
        });

        it('should prioritize content flags over content arguments', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', { name: 'reason', match: 'content' }],
                flags: [{ name: 'extraReason', match: 'content' }],
            });

            const match = registry.match('!ban member --extraReason This is the reason');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason', match: 'content' }],
                        flags: { extraReason: { name: 'extraReason', match: 'content' } },
                    },
                    args: { member: 'member' },
                    flags: { extraReason: 'This is the reason' },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!ban member This is --extraReason the reason');
            const expected2 = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason', match: 'content' }],
                        flags: { extraReason: { name: 'extraReason', match: 'content' } },
                    },
                    args: { member: 'member', reason: 'This is --extraReason the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match2, expected2)).toBe(true);
        });

        it('should match custom prefixes', () => {

            const registry = Ruby.registry({ prefix: '?' });
            registry.add({ name: 'simple' });

            const match = registry.match('?simple');
            const expected = [
                {
                    definition: { name: 'simple' },
                    args: {},
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match custom delimiters', () => {

            const registry = Ruby.registry({ delimiter: ',' });
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: ['delay'],
            });

            const match = registry.match('!ban  , member,    --delay ,10,  This is the reason , " unknown quoted  "');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            delay: { name: 'delay' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { delay: '10' },
                    unknowns: [{ arg: ' unknown quoted  ' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match custom quotes', () => {

            const registry = Ruby.registry({ quote: ['[(', ')]'] });
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
            });

            const match = registry.match('!ban member [(This is the reason)]');
            const expected = [
                {
                    definition: { name: 'ban', args: [{ name: 'member' }, { name: 'reason' }] },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match custom flag prefixes', () => {

            const registry = Ruby.registry({ flagPrefix: '::' });
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: ['delay'],
            });

            const match = registry.match('!ban member ::delay 10 "This is the reason"');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            delay: { name: 'delay' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { delay: '10' },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match custom prefixes, delimiters, quotes and flag prefixes at the same time', () => {

            const registry = Ruby.registry({ prefix: '?', flagPrefix: '::', quote: ['[[', ']]'], delimiter: ',' });
            registry.add({
                name: 'ban',
                args: ['member', 'reason'],
                flags: ['delay'],
            });

            const match = registry.match('?ban  , member,   ::delay, 10 ,  This is the reason, [[ unknown arg  ]]');
            const expected = [
                {
                    definition: {
                        name: 'ban',
                        args: [{ name: 'member' }, { name: 'reason' }],
                        flags: {
                            delay: { name: 'delay' },
                        },
                    },
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { delay: '10' },
                    unknowns: [{ arg: ' unknown arg  ' }],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });
    });
});
