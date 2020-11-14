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
            !name (arg1) ("quoted literal") (--flag1 value1) (list1,list2) (--booleanFlag) (--flag2 list1,list2) (match content)
            !name (--flag match content)
        */

        // Generate regular expressions

        const prefix = internals.escapeRegex(settings.prefix);
        const delimiter = settings.delimiter ? internals.escapeRegex(settings.delimiter) + '\\s*' : '\\s+';
        const flagPrefix = internals.escapeRegex(settings.flagPrefix);

        const quote = typeof settings.quote === 'string' ? [settings.quote, settings.quote] : settings.quote;
        const opening = internals.escapeRegex(quote[0]);
        const closing = internals.escapeRegex(quote[1]);

        const delimiterOrEOL = '(?:' + delimiter + '|$)';                                        // Do not use lookahead clauses because we want the delimiter to be included in the matching string

        this._regexes = {
            literal: new RegExp('^' + opening + '(.*?)' + closing + delimiterOrEOL),             // Matches literals followed by a delimiter or EOL
            delimiter: new RegExp('^' + delimiter),                                              // Matches a delimiter
            flag: new RegExp('^' + flagPrefix + '(.*?)' + delimiterOrEOL),                       // Matches a flag followed by a delimiter or EOL
            base: new RegExp('^' + prefix + '(.*?)' + delimiterOrEOL + '(.*)'),                  // Matches the prefix, command name and arguments
        };

        this._definitions = new internals.Definitions();
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
                    const arg = internals.normalizeArgLike(args[i]);

                    Bone.assert(arg.match !== 'content' || i === args.length - 1, `Argument "${arg.name}" must be defined last because it is matching content`);

                    args[i] = arg;
                }
            }

            // Normalize flags

            const flags = definition.flags;
            if (flags) {
                const normalized = {};
                for (const flag of definition.flags) {
                    normalized[flag.name] = internals.normalizeArgLike(flag);
                }

                if (Object.keys(normalized).length > 0) {
                    definition.flags = normalized;
                }
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

    get(name) {

        return this._definitions.get(name);
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

        const matches = [];
        for (const definition of definitions) {
            const match = { name, args: {}, flags: {}, unknowns: [] };
            let idx = 0;                                                            // Current argument definition pointer
            let current = '';                                                       // Current argument value
            let flag = null;                                                        // Previous parsed flag definition
            let arg = null;                                                         // Current argument definition

            const flush = (literal) => {

                if (!current) {
                    return;
                }

                if (flag) {                                                         // (--flag value) (--flag list1,list2) (--flag "quote string")
                    match.flags[flag.name] = literal ? current : internals.value(current, flag);
                }
                else if (arg) {                                                     // (value) (list1,list2) ("quoted string")
                    match.args[arg.name] = literal ? current : internals.value(current, arg);
                    idx++;
                }
                else {
                    match.unknowns.push({ arg: current });
                }

                current = '';
            };

            for (let i = 0; i < raw.length; i++) {
                const sub = raw.slice(i);
                arg = definition.args ? definition.args[idx] : null;

                // Match content

                if (arg &&
                    arg.match === 'content') {

                    if (flag) {                                                     // (--flag match content)
                        match.flags[flag.name] = sub;
                    }
                    else {                                                          // (match content)
                        match.args[flag.name] = sub;
                    }

                    break;
                }

                // Match literal

                const literalMatch = sub.match(this._regexes.literal);
                if (literalMatch) {
                    current = literalMatch[1];
                    flush(true);
                    flag = null;
                    i += literalMatch[0].length - 1;
                    continue;
                }

                // Match flag

                const flagMatch = sub.match(this._regexes.flag);
                if (flagMatch) {
                    if (flag) {                                                     // (--booleanFlag1) (--booleanFlag2)
                        match.flags[flag.name] = true;
                    }

                    const flagName = flagMatch[1];
                    flag = definition.flags && definition.flags[flagName];
                    if (!flag) {
                        match.unknowns.push({ flag: flagName });
                        flag = null;
                    }

                    i += flagMatch[0].length - 1;
                    continue;
                }

                // Match delimiter

                const delimiterMatch = sub.match(this._regexes.delimiter);
                if (delimiterMatch) {
                    flush();
                    flag = null;
                    i += delimiterMatch[0].length - 1;
                    continue;
                }

                current += raw[i];
            }

            // Remaining characters

            flush();

            // Last flag

            if (flag) {
                match.flags[flag.name] = true;
            }

            matches.push(match);
        }

        return matches;
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
        arg = { name: arg };
    }

    return Schemas.argLike.attempt(arg);
};

internals.value = function (value, definition) {

    if (definition.match === 'list') {
        return value.split(definition.delimiter);
    }

    return value;
};
