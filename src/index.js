import { setupStorage } from './storage'
import { setupTasks } from './tasks'
import { routes } from './api'
import EventEmitter from 'events'
import path from 'path'

const bus = new EventEmitter()

export class Climate {
  constructor () {
    this.version = '0.0.1'
  }

  async serve (options) {
    const storage = await setupStorage(bus)

    await setupTasks(bus)

    const express = require('express')
    const compression = require('compression')
    const bodyParser = require('body-parser')
    const browserify = require('browserify-middleware')
    const app = express()
    const config = {
      port: options.port || '3210',
      configDir: options.config || './config'
    }

    app.use(compression())
    app.use(bodyParser.urlencoded({extended: false}))
    app.use(bodyParser.json())

    routes(app, storage, config)

    // temporarily serve climate sdk js
    const baboptions = {presets: ['es2015'], plugins: ['transform-es2015-modules-commonjs', 'transform-async-to-generator']}
    const browsoptions = {transform: [['babelify', baboptions]]}
    const sdkjspath = path.join(__dirname, '/sdk/index.js')
    app.get('/sdk/climate.js', browserify(sdkjspath, browsoptions))

    // static files used by the SDK and should be hosted by the api - like the login form
    app.use('/static', express.static(path.join(__dirname, '..', 'static')))

    app.listen(config.port)

    console.log('listening on 127.0.0.1:' + config.port)
    console.log('Add this to get access to the climate SDK:')
    console.log('<script src="//localhost:' + config.port + '/sdk/climate.js"></script>')
  }
}
