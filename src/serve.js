import { setupStorage } from './storage'
import { setupTasks } from './tasks'
import { routes } from './api'
import EventEmitter from 'events'

const bus = new EventEmitter()

async function serve () {
  const storage = await setupStorage(bus)

  await setupTasks(bus)

  const express = require('express')
  const compression = require('compression')
  const bodyParser = require('body-parser')
  const app = express()

  app.use(compression())
  app.use(bodyParser.urlencoded({extended: false}))
  app.use(bodyParser.json())

  routes(app, storage)

  app.listen(3000)

  console.log('listening on 127.0.0.1:3000')
}

serve()
