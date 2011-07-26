#!/usr/bin/env node
var app = require('../watch');

var static_dir = '.';

console.log('starting', process.argv);
if (process.argv.length > 2) {
    static_dir = process.argv[2];
}

app.init(static_dir);
