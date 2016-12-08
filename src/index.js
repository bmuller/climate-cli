import { setupStorage } from './storage'
import { setupTasks } from './tasks'
import { routes } from './api'
import EventEmitter from 'events'

const bus = new EventEmitter()

export class Climate {
  constructor () {
    this.version = '0.0.1'
  }
  
  async serve () {
    const storage = await setupStorage(bus)

    await setupTasks(bus)
    
    const express = require('express')
    const compression = require('compression')
    const bodyParser = require('body-parser')
    const browserify = require('browserify-middleware')
    const app = express()
    
    app.use(compression())
    app.use(bodyParser.urlencoded({extended: false}))
    app.use(bodyParser.json())
    
    routes(app, storage)

    // temporarily serve climate sdk js
    const boptions = { transform: [['babelify', {presets: ["es2015"]} ]] }
    app.get('/sdk/climate.js', browserify(__dirname + '/sdk/index.js', boptions))
    
    app.listen(3000)

    console.log('listening on 127.0.0.1:3000')
  }
}
