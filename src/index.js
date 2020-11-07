'use strict';

const Bone = require('@botsocket/bone');

const internals = {
    //         (name)             (*)(count)
    argRx: /^{([a-zA-Z0-9_-]+)}(?:(\*)([0-9]+)?)?$/,
};

exports.registry = function (options) {

    return new internals.Registry(options);
};

internals.Registry = class {
    constructor(options = {}) {

        internals.assertBaseOptions(options);

        this._prefix = options.prefix || '!';
        this._delimiter = options.delimiter || /\s+/;

        this._definitions = [];
    }

    add(definition) {

        Bone.assert(typeof definition === 'object', 'Command must be an object');
        Bone.assert(typeof definition.syntax === 'string', 'Option syntax must be a string');
        Bone.assert(definition.alias === undefined || typeof definition.alias === 'string' || Array.isArray(definition.alias), 'Option alias must be a string or an array');
        internals.assertBaseOptions(definition);

        // Prepare definition

        definition = Bone.clone(definition, { shallow: true });

        if (typeof definition.alias === 'string') {
            definition.alias = [definition.alias];
        }

        // Parse syntax

        const delimiter = definition.delimiter || this._delimiter;
        const [name, ...args] = definition.syntax.split(delimiter);
        definition.name = name;
        delete definition.syntax;

        if (args.length) {
            definition.args = [];

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                const match = internals.argRx.exec(arg);

                Bone.assert(match, `Invalid argument definition: ${arg}`);

                const count = match[3]
                    ? parseInt(match[3], 10)                // With count
                    : (match[2] ? Infinity : 1);            // * without count

                Bone.assert(count !== Infinity || i === args.length - 1, 'Greedy arguments must be the last argument in the syntax');

                definition.args.push({
                    name: match[1],
                    count,
                });
            }
        }

        this._definitions.push(definition);
    }

    match(message) {

        const matches = [];

        for (const definition of this._definitions) {

            // Match prefix

            const prefix = definition.prefix || this._prefix;
            const rawPrefix = message.slice(0, prefix.length);

            if (rawPrefix !== prefix) {
                continue;
            }

            // Split message

            const delimiter = definition.delimiter || this._delimiter;
            const [rawName, ...rawArgs] = message.slice(prefix.length).split(delimiter);

            // Match name or alias

            const name = definition.name;
            const alias = definition.alias;
            if (rawName !== name && !alias.includes(rawName)) {
                continue;
            }

            const match = { name, args: {} };

            // Match arguments

            const args = definition.args;

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];

                if (arg.count === 1) {
                    match.args[arg.name] = rawArgs.shift();
                    continue;
                }

                let count = 1;
                while (count <= arg.count) {
                    const rawArg = rawArgs.shift();
                    if (!rawArg) {
                        break;
                    }

                    count++;

                    if (match.args[arg.name]) {
                        match.args[arg.name].push(rawArg);
                        continue;
                    }

                    match.args[arg.name] = [rawArg];
                }
            }

            matches.push(match);
        }

        return matches;
    }
};

internals.assertBaseOptions = function (options) {

    Bone.assert(options.prefix === undefined || typeof options.prefix === 'string', 'Option prefix must be a string');
    Bone.assert(options.delimiter === undefined || typeof options.delimiter === 'string' || options.delimiter instanceof RegExp, 'Option delimiter must be a string or a regular expression');
    Bone.assert(options.delimiter instanceof RegExp === false || (!options.delimiter.includes('y') && !options.delimiter.includes('g')), 'Option delimiter must not have sticky or global flag');
};
