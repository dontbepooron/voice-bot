'use strict';

const ownerCmd = require('./owner');

module.exports = {
    name: 'ownerlist',
    aliases: [],
    description: 'Alias pour =owner list — Liste les owners de la guilde.',
    usage: '=ownerlist',

    async run(message, args) {
        // Redirige vers owner list
        return ownerCmd.run(message, ['list']);
    },
};
