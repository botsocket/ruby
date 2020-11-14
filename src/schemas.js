'use strict';

const Jade = require('@botsocket/jade');

const internals = {};

exports.options = Jade.obj({
    prefix: Jade.str().default('!'),
    delimiter: Jade.str(),
    flagPrefix: Jade.str().invalid(Jade.ref('delimiter')).default('--'),
    quote: Jade.alt(
        Jade.str(),
        Jade.arr().ordered(Jade.str().required(), Jade.str().required()),
    )
        .invalid(Jade.ref('flagPrefix'), Jade.ref('delimiter'))
        .default('"'),
})
    .default();

exports.definitions = Jade.arr(Jade.obj()).min(1);

exports.definition = Jade.obj({
    name: Jade.str().required(),
    alias: Jade.arr(Jade.str()).unique().single(),
    args: Jade.arr().min(1),
    flags: Jade.arr().min(1),
    data: Jade.any(),
});

internals.argLike = {
    name: Jade.str().required(),
    match: ['content', 'list'],
    delimiter: Jade.when('match', {
        is: 'list',
        then: Jade.str().default(','),
        otherwise: Jade.forbidden(),
    }),
};

exports.args = Jade.obj(internals.argLike);

exports.flags = Jade.obj({
    ...internals.argLike,
    match: [...internals.argLike.match, 'boolean'],
});
