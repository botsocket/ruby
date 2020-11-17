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
for (const match of matches) {

    // Invoke the handler

    match.definition.data.handler(match.args, match.flags);
}
```

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

client.connect();

client.on('message', (message) => {

    const matches = registry.match(message.content);
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
    for (const match of matches) {
        match.definition.data.handler(client, channel, match.args, match.flags);
    }
});
```

