'use strict';

const ownerCmd = require('./owner');

module.exports = {
    name: 'unowner',
    aliases: [],
    description: 'Alias pour =owner remove — Retirer un owner.',
    usage: '=unowner @user',

    async run(message, args) {
        return ownerCmd.run(message, ['remove', ...args]);
    },
};
