const express = require('express')
const compression = require('compression')
const bodyParser = require('body-parser')
const app = express()

app.use(compression())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

function fetchRecordStore () {}
function fetchRecord () {}

app.route('/record-stores')
  .get((req, res) => {
  })
  .post((req, res) => {
  })

app.route('/record-stores/:id')
  .all((req, res, next) => {
    const id = req.params.id

    fetchRecordStore(id)
      .then(store => {
        if (store) {
          req.recordStore = store
          next()
        } else {
          res.status(404).json({ error: 'not found', type: 'record-store', id })
        }
      })
      .catch(e => next(e))
  })
  .get((req, res) => {
  })
  .patch((req, res) => {
  })
  .put((req, res) => {
  })
  .delete((req, res) => {
  })

app.route('/record-stores/:recordStoreId/records')
  .all((req, res, next) => {
    const id = req.params.recordStoreId

    fetchRecordStore(id)
      .then(store => {
        if (store) {
          req.recordStore = store
          next()
        } else {
          res.status(404).json({ error: 'not found', type: 'record-store', id })
        }
      })
      .catch(e => next(e))
  })
  .get((req, res) => {
  })
  .post((req, res) => {
  })

app.route('/record-stores/:recordStoreId/records/:key')
  .all((req, res, next) => {
    const recordStoreId = req.params.recordStoreId
    const key = req.params.key

    fetchRecord(recordStoreId, key)
      .then(store => {
        if (store) {
          req.recordStore = store
          next()
        } else {
          res.status(404).json({ error: 'not found', type: 'record', store: recordStoreId, key })
        }
      })
      .catch(e => next(e))
  })
  .get((req, res) => {
  })
  .patch((req, res) => {
  })
  .put((req, res) => {
  })
  .delete((req, res) => {
  })

app.listen(3000)
