#!/usr/bin/env node

const argv = require('yargs').argv
const Canoga = require('..')

/* eslint-disable-next-line */
let c = argv._ && argv._[0] ? new Canoga({path: argv._[0]}) : new Canoga()
