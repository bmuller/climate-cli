#!/usr/bin/env node
const program = require('commander')
const Climate = require('../')
const cli = new Climate()

var cmd, opts

program
  .version(cli.version)
  .option('-v, --verbose', 'Verbose output')

program
  .command('serve')
  .alias('s')
  .description('Run the development server')
  .option('-p, --port <port>', 'The port to run on')
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
  cli.serve()
} else if (cmd === 'init') {
  console.log('not yet!')
} else {
  program.help()
}
