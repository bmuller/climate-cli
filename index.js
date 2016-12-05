module.exports = Climate

const debug = require('debug')
const express = require('express')
const compression = require('compression')
const bodyParser = require('body-parser')

function Climate () {
  this.version = process.env.npm_package_version
  this.debug = debug('climate')
  this.app = express()
  this.app.use(compression())
  this.app.use(bodyParser.urlencoded({extended: false}))
  this.app.use(bodyParser.json())
}

Climate.prototype.serve = function (opts) {
  this.debug('Starting server.')
  this.app.listen(3000)
}
