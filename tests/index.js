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

    describe('match()', () => {

        it('should return null for mismatching prefixes', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' });

            const match = registry.match('?simple');
            expect(match).toBe(null);
        });

        it('should return null if definiton is not found', () => {

            const registry = Ruby.registry();
            const match = registry.match('!simple');
            expect(match).toBe(null);
        });

        it('should match simple commands', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' });

            const match = registry.match('!simple');
            const expected = [{ name: 'simple', args: {}, flags: {}, unknowns: [] }];

            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match simple commands with aliases', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple', alias: 'easy' });

            const match = registry.match('!simple');
            const expected = [{ name: 'simple', args: {}, flags: {}, unknowns: [] }];
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
                    name: 'ban',
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

            const match = registry.match('!ban member reason someOtherReason');
            const expected = [
                {
                    name: 'ban',
                    args: { member: 'member', reason: 'reason' },
                    flags: {},
                    unknowns: [{ arg: 'someOtherReason' }],
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
                    name: 'ban',
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
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
                    name: 'ban',
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: {},
                    unknowns: [],
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
                    name: 'ban',
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
                    name: 'ban',
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
                    name: 'ban',
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
                    name: 'ban',
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
                    name: 'ban',
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
                    name: 'ban',
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
                    name: 'ban',
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);

            const match2 = registry.match('!ban member --sendBanAppeal --someUnknownFlag "This is the reason"');
            const expected2 = [
                {
                    name: 'ban',
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
                    name: 'ban',
                    args: { member: 'member', reason: 'This is the reason' },
                    flags: { sendBanAppeal: true },
                    unknowns: [],
                },
            ];

            expect(Bone.equal(match, expected)).toBe(true);
        });
    });
});
