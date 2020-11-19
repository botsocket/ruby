# Documentation

## Introduction

Ruby is a library for command resolving and parsing. Designed to be platform-agnostic, it can be used for Slack and Twitch bots as well as Discord bots.

## Installation

Ruby is available on npm:

```bash
npm install @botsocket/ruby
```

## Usage

Setting up Ruby is often a 3 step process.

First, create a new registry. Note that only one registry should be created for the whole application:

```js
const Ruby = require('@botsocket/ruby');

const registry = Ruby.registry();
```

Next, define your commands and pass definition-specific data (in this case, the command handler is stored):

```js

// !ban member reason

registry.add({
    name: 'ban',
    args: ['member', 'reason'],

    data: {
        handler(args, flags) {

            // Do stuff
        }
    }
});
```

Last, find the matching definitions by parsing the command:

```js
const matches = registry.match('!ban member reason');
if (match) {
    for (const match of matches) {

        // Invoke the handler, passing arguments and flags

        match.definition.data.handler(match.args, match.flags);
    }
}
```

In the above example, `match` is an object containing information about the command with the [following properties](#match-object)

### Usage with Discord.js

```js
const Ruby = require('@botsocket/ruby');
const Discord = require('discord.js');

const registry = Ruby.registry();

// !repeat message

registry.add({
    name: 'repeat',
    args: ['message'],

    data: {
        handler(message, args, flags) {

            if (!args.message) {
                message.channel.send('Message is required');
                return;
            }

            if (args.message.length > 5) {
                message.channel.send('Message must have at least 5 characters');
                return;
            }

            message.channel.send(args.message);
        }
    }
});

const client = new Discord.Client({
    // Stuff
});

client.login('your_token');

client.on('message', (message) => {

    const matches = registry.match(message.content);
    if (!matches) {
        return;
    }

    for (const match of matches) {
        match.definition.data.handler(message, match.args, match.flags);
    }
});
```

### Usage with Tmi.js

```js
const Ruby = require('@botsocket/ruby');
const Tmi = require('tmi.js');

const registry = Ruby.registry();

// !repeat message

registry.add({
    name: 'repeat',
    args: ['message'],

    data: {
        handler(client, channel, args, flags) {

            if (!args.message) {
                client.say(channel, 'Message is required');
                return;
            }

            if (args.message.length > 5) {
                client.say(channel, 'Message must have at least 5 characters');
                return;
            }

            client.say(channel, args.message);
        }
    }
});

const client = new Tmi.Client({
    // Stuff
});

client.connect();

client.on('message', (channel, tags, message, self) => {

    const matches = registry.match(message);
    if (!matches) {
        return;
    }

    for (const match of matches) {
        match.definition.data.handler(client, channel, match.args, match.flags);
    }
});
```

### Validating arguments

[Jade](https://github.com/botsocket/jade) can be used in conjunction with Ruby to provide argument validation:

```js
const Jade = require('@botsocket/jade');
const Ruby = require('@botsocket/ruby');
const Discord = require('discord.js');

const registry = Ruby.registry();

// !repeat "message" 10

registry.add({
    name: 'repeat',
    args: ['message', 'delay'],

    data: {
        schema: Jade.object({
            message: Jade.string().min(5).required(),
            delay: Jade.number().greater(0),
        }),

        handler(message, args, flags) {

            // Arguments passed to the handler have been validated
        }
    },
});

const client = new Discord.Client();

client.on('message', (message) => {

    const matches = registry.match(message.content);
    if (!matches) {
        return;
    }

    for (const match of matches) {
        const { schema, handler } = match.definition.data;

        // If no schema is defined, proceed as normal

        if (!schema) {
            handler(message, match.args, match.flags);
            return;
        }

        // Validate arguments

        const result = schema.validate(match.args);

        // Send error message if any

        if (result.errors) {
            message.channel.send('Invalid arguments');
            return;
        }

        // Proceed but with validated arguments

        handler(message, result.value, match.flags);
    }
});

client.login();
```

## API

-   [`registry()`](#registryoptions)
    -   [`registry.add()`](#registryadddefinitions)
    -   [`registry.match()`](#registrymatchmessage)
    -   [`registry.definitions`](#registrydefinitions)

### `registry(options)`

Creates a new registry where:
-   `options`: Optional options where:
    -   `prefix`: The prefix to use. Defaults to `!`.
    -   `quote`: The quotes to use. Can be a string or an array of two items corresponding to a pair of quotes. Defaults to `"`.
    -   `flagPrefix`: The prefix to use for flags. Defaults to `--`.
    -   `delimiter`: The delimter to use. Defaults to whitespaces.

```js
const registry = Ruby.registry({
    prefix: '?',
    quote: ['(', ')'],
    flagPrefix: '++',
    delimiter: ',',
});
```

[Back to top](#api)

#### `registry.add(...definitions)`

Adds command definitions to the current registry where:
-   `...definitions`: Definition objects where:
    -   `name`: The name of the command.
    -   `alias`: An alias or an array of aliases for the command.
    -   `args`: An array of argument names or definition objects where:
        -   `name`: The name of the argument.
        -   `match`: The match mode for the argument. Can be `content` or `list`.
        -   `delimiter`: The pattern describing where each split would occur if `match` is set to `list`. Defaults to `,`.
    -   `flags`: An array of flag names or definition objects where:
        -   `name`: The name of the flag.
        -   `match`: The match mode for the flag. Can be `content`, `list` or `boolean`.
        -   `delimiter`: The pattern describing where each split would occur if `match` is set to `list`. Defaults to `,`.
    -   `data`: Definition-specific data. Not required but it is recommeneded to store command handlers and any associated data so Ruby can act as a resolver as well.

The order in which arguments are declared dictates what values they will get. For example, given the string `first second`, the definition `['a', 'b']` will generate `{ a: 'first', b: 'second' }` whilst `['b', 'a']` will generate `{ a: 'second', b: 'first' }`. Flags are matched by name, therefore the order does not matter.

```js
const registry = Ruby.registry();

// !ban member reason

registry.add({
    name: 'ban',
    args: ['member', 'reason'],

    data: {
        handler() {

            // Stuff
        },
    }
});

```

[Back to top](#api)

##### Matching content

When an argument or flag match mode is set to `content`, the rest of the string will be return as is and delimiters will be ignored.

```js
const registry = Ruby.registry();

registry.add({
    name: 'ban',
    args: ['member', { name: 'reason', match: 'content' }],
});
```

The above example will return `{ member: 'member', reason: 'This is the reason' }` when the string `!ban member This is the reason` is supplied. Flags behave similarly.

[Back to top](#api)

##### Matching lists

When an argument or flag match mode is set to `list`, the value will be split based on the `delimiter` option defined within the flag definition object (not to be confused with the argument delimiter `registry.options.delimiter`).

```js
const registry = Ruby.registry();

registry.add({
    name: 'ban',
    args: [{ name: 'members', match: 'list' }, 'reason'],
});
```

The above example will return `{ members: ['member1', 'member2'], reason: 'reason' }` when the string `!ban member1,member2 reason` is supplied. Flags behave similarly. Note that whitespaces are not permitted due to parsing ambiguity. To control how arguments or flags should be split, define them as normal arguments and perform split logic within the handlers.

[Back to top](#api)

##### Matching boolean flags

By default, flags take values defined **immediately after** them. For example, `--delay 10` returns `{ delay: '10' }`. In cases where flags are defined **immediately before** another or last, the parser will return true for them. Examples of such cases are:

```
!ban member "This is the reason" --sendBanAppeal                ->  { sendBanAppeal: true }
!ban member --sendBanAppeal --anotherFlag "some flag value"     ->  { sendBanAppeal: true, anotherFlag: 'some flag value' }
```

In the above example, `sendBanAppeal` is an implicit boolean flag because it does not have the match mode set to `boolean`. More importantly, strings like `!ban member --sendBanAppeal "This is the reason"` will cause the parser to return `{ sendBanAppeal: 'This is the reason' }` instead of `{ sendBanAppeal: true }`. To make sure `true` will always be received, the match mode must be set to `boolean`:

```js
const registry = Ruby.registry();

registry.add({
    name: 'ban',
    args: ['member', 'reason'],
    flags: [{ name: 'sendBanAppeal', match: 'boolean' }],
});
```

[Back to top](#api)

##### Match order

Ruby parses flags and arguments in the following order:

-   Content flags.
-   Normal flags.
-   Content arguments.
-   Literal and normal arguments.

If a normal flag is defined after a content flag, the parser will consider it the content of preceding flag. Defining it **immediately after** a content argument will have no effect. Quotes will not be removed if supplied after a content flag or argument.

[Back to top](#api)

#### `registry.match(message)`

Matches a message against the definitions where:
-   `message`: The message to match.

If no matching definition is found, Ruby will return `null`. Otherwise, it will return an array of [match objects](#match-object).

```js
const registry = Ruby.registry();

registry.match('!ban');             // null

registry.add({ name: 'ban' });

registry.match('!ban');             // [ { definition: { name: 'ban' }, args: {}, flags: {}, unknowns: [] } ]
```

[Back to top](#api)

##### Match object

`registry.add()` returns an array of match objects, each with the following properties:

-   `definition`: A definition object with:
    -   `name`: The name of the command.
    -   `alias`: An array of aliases of the command.
    -   `args`: An array of argument definitions. Not to be confused with parsed arguments.
    -   `flags`: An array of flag definitions. Not to be confused with parsed flags.
    -   `data`: The `data` property passed to `registry.add()` left untouched.
-   `args`: Parsed arguments where each key corresponds to an argument name and each value corresponds to the supplied value extracted from the message.
-   `flags`: Parsed flags where each key corresponds to a flag name and each value corresponds to the supplied value extracted from the message.
-   `unknowns`: An array of unknown arguments or flags.

[Back to top](#api)

#### `registry.definitions`

Returns registered definitions as a flat array. Useful for generating help commands.

[Back to top](#api)


