#!/usr/bin/env node
const program = require('commander')
const { Climate } = require('../dist')
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
  .action(options => {
    cmd = 'serve'
    opts = options
  })

program
  .command('migrate')
  .alias('m')
  .description('Run through the newest migrations locally')
  .action(options => {
    cmd = 'migrate'
    opts = options
  })

program
  .command('init <name>')
  .alias('i')
  .description('Initialize a new project')
  .action((name, options) => {
    cmd = 'init'
    opts = options
    opts.name = name
  })

program.parse(process.argv)

switch(cmd) {
  case 'serve':
    cli.serve()
  case 'migrate':
    cli.migrate()
  case 'init':
    console.error('not yet!')
  default:
    program.help()
}
