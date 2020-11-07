# Documentation

## Introduction

Ruby is a library for command resolving and parsing.

## Installation

Ruby is available on npm:

```bash
npm install @botsocket/ruby
```

## Usage

Usage with Discord.js:

```js
const Ruby = require('@botsocket/ruby');
const Discord = require('discord.js');

const registry = Ruby.registry({ prefix: '!', delimiter: /\s+/, });

registry.register({
    syntax: 'repeat {message}',
    alias: 'say',
    prefix: '?',                            // Overriding prefix
    delimiter: ',',                         // Overriding delimiter
});

const commands = {
    async repeat(message, args) {

        message.channel.send(args.message);
    },
};

client.on('message', (message) => {

    const match = registry.match(message.content);

    if (!match) {
        return;
    }

    const name = match.name;
    const args = match.args;

    return commands[name](message, args);
});

client.cconnect('your_token');
```
