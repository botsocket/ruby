'use strict';

const Bone = require('@botsocket/bone');

const Ruby = require('../src');

describe('registry()', () => {

    describe('match()', () => {

        it('should match simple commands', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'simple' });

            const match = registry.match('!simple');
            const expected = [{ name: 'simple', args: {}, flags: {}, unknowns: [] }];
            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match simple commands with no argument definition', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban' });

            const match = registry.match('!ban member reason');
            const expected = [{ name: 'ban', args: {}, flags: {}, unknowns: [{ arg: 'member' }, { arg: 'reason' }] }];
            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with argument definitions', () => {

            const registry = Ruby.registry();
            registry.add({ name: 'ban', args: ['member', 'reason'] });

            const match = registry.match('!ban member reason someOtherReason');
            const expected = [{ name: 'ban', args: { member: 'member', reason: 'reason' }, flags: {}, unknowns: [{ arg: 'someOtherReason' }] }];
            expect(Bone.equal(match, expected)).toBe(true);
        });

        it('should match commands with a content argument', () => {

            const registry = Ruby.registry();
            registry.add({
                name: 'ban',
                args: ['member', { name: 'reason', match: 'content' }],
            });

            const match = registry.match('!ban member reason someOtherReason');
            const expected = [{ name: 'ban', args: { member: 'member', reason: 'reason someOtherReason' }, flags: {}, unknowns: [] }];
            expect(Bone.equal(match, expected)).toBe(true);
        });
    });
});
