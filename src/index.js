'use strict';

const Bone = require('@botsocket/bone');

const Schemas = require('./schemas');

const internals = {};

exports.registry = function (options) {

    return new internals.Registry(options);
};

internals.Registry = class {
    constructor(options = {}) {

        const settings = Schemas.options.attempt(options);

        /*
            !name (arg1) ("literal") (--flag1 value1) (list1,list2) (--booleanFlag) (--flag2 list1,list2) (match content)
            !name (--flag match content)
        */

        // Generate regular expressions

        const prefix = internals.escapeRegex(settings.prefix);

        const delimiter = settings.delimiter ? internals.escapeRegex(settings.delimiter) : '';
        const delimiterOrEOL = '(?:' + (delimiter ? '\\s*' + delimiter + '\\s*' : '\\s+') + '|$)';           // Do not use lookahead clauses because we want the delimiter to be included in the matching string

        const ignoreChars = delimiter || '\\s';
        const value = '([^' + ignoreChars + ']+?)';

        const flagPrefix = internals.escapeRegex(settings.flagPrefix);
        const flag = flagPrefix + '(.*?)';

        const quote = typeof settings.quote === 'string' ? [settings.quote, settings.quote] : settings.quote;
        const opening = internals.escapeRegex(quote[0]);
        const closing = internals.escapeRegex(quote[1]);
        const literal = opening + '(.*?)' + closing;

        this._regexes = {
            args: new RegExp('(?:' + [literal, flag, value].join('|') + ')' + delimiterOrEOL, 'g'),
            base: new RegExp('^' + prefix + '(.*?)' + delimiterOrEOL + '(.*)'),
        };

        this._definitions = new internals.Definitions();
    }

    get definitions() {

        return [].concat(...this._definitions.values());
    }

    add(...definitions) {

        definitions = Schemas.definitions.attempt(definitions);

        // Process definitions

        for (let definition of definitions) {
            definition = Schemas.definition.attempt(definition);

            // Normalize args

            const args = definition.args;
            if (args) {
                for (let i = 0; i < args.length; i++) {
                    const arg = Schemas.args.attempt(internals.normalizeArgLike(args[i]));

                    Bone.assert(arg.match !== 'content' || i === args.length - 1, `Argument "${arg.name}" must be defined last because it is matching content`);

                    args[i] = arg;
                }
            }

            // Normalize flags

            const flags = definition.flags;
            if (flags) {
                const normalized = {};
                for (let flag of flags) {
                    flag = Schemas.flags.attempt(internals.normalizeArgLike(flag));
                    normalized[flag.name] = flag;
                }

                definition.flags = normalized;
            }

            // Store definitions by names

            const name = definition.name;
            this._definitions.set(name, definition);

            // Store definitions by aliases

            const aliases = definition.alias;
            if (aliases) {
                for (const alias of aliases) {
                    this._definitions.set(alias, definition);
                }
            }
        }

        return this;
    }

    match(message) {

        // Match base

        const baseMatch = message.match(this._regexes.base);
        if (!baseMatch) {
            return null;
        }

        const name = baseMatch[1];
        const definitions = this._definitions.get(name);

        if (!definitions) {
            return null;
        }

        // Match arguments

        const raw = baseMatch[2];

        const results = [];
        for (const definition of definitions) {
            this._regexes.args.lastIndex = 0;

            const result = { definition, args: {}, flags: {}, unknowns: [] };
            results.push(result);

            let idx = 0;                                                        // Current arg definition pointer
            let position = 0;                                                   // Current string position
            let flag = null;                                                    // Current flag definition

            while (true) {                                                      // eslint-disable-line no-constant-condition

                // Content flags

                if (flag &&
                    flag.match === 'content') {                                 // (--flag match content)

                    result.flags[flag.name] = raw.slice(position);
                    flag = null;
                    break;
                }

                const match = this._regexes.args.exec(raw);

                if (!match) {
                    break;
                }

                const [item, literal, flagName, value] = match;

                // Match flags

                if (flagName) {
                    if (flag) {                                                 // (--booleanFlag) (implicit)
                        result.flags[flag.name] = true;
                    }

                    flag = definition.flags && definition.flags[flagName];
                    if (!flag) {
                        result.unknowns.push({ flag: flagName });
                        flag = null;
                    }
                    else if (flag.match === 'boolean') {                        // (--booleanFlag) (explicit)
                        result.flags[flag.name] = true;
                        flag = null;
                    }

                    position += item.length;
                    continue;
                }

                const arg = definition.args && definition.args[idx];

                // Content arguments

                if (arg &&
                    arg.match === 'content') {                                  // (match content)

                    result.args[arg.name] = raw.slice(position);
                    break;
                }

                // Match literals/values

                if (flag) {                                                     // (--flag "literal") (--flag value) (--flag list1,list2)
                    result.flags[flag.name] = literal || internals.value(value, flag);
                    flag = null;
                }
                else if (arg) {                                                 // ("literal") (value) (list1,list2)
                    result.args[arg.name] = literal || internals.value(value, arg);
                    idx++;
                }
                else {
                    result.unknowns.push({ arg: literal || value });
                }

                position += item.length;
            }

            if (flag) {                                                         // (--booleanFlag) (implicit)
                result.flags[flag.name] = true;
            }
        }

        return results;
    }
};

internals.Definitions = class extends Map {

    set(key, definition) {

        const set = this.get(key);
        if (set) {
            set.push(definition);
            return;
        }

        super.set(key, [definition]);
    }
};

internals.escapeRegex = function (raw) {

    return raw.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, '\\$&');
};

internals.normalizeArgLike = function (arg) {

    if (typeof arg === 'string') {
        return { name: arg };
    }

    return arg;
};

internals.value = function (value, definition) {

    if (definition.match === 'list') {
        return value.split(definition.delimiter);
    }

    return value;
};
