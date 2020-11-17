# Documentation

## Introduction

Ruby is a library for command resolving and parsing. Designed to be platform-agnostic, it can be used for Slack and Twitch bots as well as Discord bots.

## Installation

Ruby is available on npm:

```bash
npm install @botsocket/ruby
```

## Usage

Setting up Ruby is often a 3 step process. You should refer to [API](#api) for certain method signatures.

First, create a new registry. Note that only one registry should be created for the whole application:

```js
const Ruby = require('@botsocket/ruby');

const registry = Ruby.registry();
```

Next, define your commands and pass definition-specific data (recommended to store command handlers):

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
if (!matches) {
    return;
}

for (const match of matches) {

    // Invoke the handler

    match.definition.data.handler(match.args, match.flags);
}
```

In the above example, `match` is an object containing information about the command with the [following properties](#match-object)

Usage with Discord.js:

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

client.login();

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

Usage with Tmi.js:

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
        if (!schema) {
            handler(message, match.args, match.flags);
            return;
        }

        const result = schema.validate(match.args);
        if (result.errors) {
            message.channel.send(result.errors[0].message);
            return;
        }

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

#### `registry.add(...definitions)`

##### Matching syntax

Ruby matches and parses commands using the following syntax:

```
[ (prefix) (name) ] (delimiter) [ ("literal") (delimiter) (--flag) (delimiter) (value) (--booleanFlag) (delimiter) (argument) ]
    [1]: Base                                                            [2]: Arguments
```

A command is split into 2 components separated by delimiter:
-   Base: Includes the prefix and name.
-   Arguments: Includes arguments and flags separated by delimiter.

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

##### Match order/priority

The parser parses flags and arguments in the following order:

-   Content flags.
-   Normal flags.
-   Content arguments.
-   Literal and normal arguments.

Therefore, if a normal flag is defined after a content flag, the parser will consider it the content of preceeding flag. Defining it **immediately after** a content argument will have no effect. Quotes will not be removed if supplied after a content flag or argument.

#### `registry.match(message)`

#### `registry.definitions`


