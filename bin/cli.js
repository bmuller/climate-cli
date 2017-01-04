#!/usr/bin/env node
const program = require('commander')
const { Climate } = require('../dist')
const cli = new Climate()
require('dotenv').config()

var cmd, opts

program
  .version(cli.version)
  .option('-v, --verbose', 'Verbose output')

program
  .command('serve')
  .alias('s')
  .description('Run the development server')
  .option('-p, --port <port>', 'The port to run on')
  .option('-c, --config <folder>', 'The folder with config files')
  .action(function (options) {
    cmd = 'serve'
    opts = options
  })

program
  .command('init <name>')
  .alias('i')
  .description('Initialize a new project')
  .action(function (name, options) {
    cmd = 'init'
    opts = options
    opts.name = name
  })

program.parse(process.argv)

if (cmd === 'serve') {
  cli.serve(opts)
} else if (cmd === 'init') {
  console.log('not yet!')
} else {
  program.help()
}
