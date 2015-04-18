#!/usr/bin/env node
'use strict';
var meow = require('meow');
var cubomediaWatcher = require('./');

var cli = meow({
  help: [
    'Usage',
    '  cubomedia-watcher <input>',
    '',
    'Example',
    '  cubomedia-watcher Unicorn'
  ].join('\n')
});

cubomediaWatcher(cli.input[0]);
