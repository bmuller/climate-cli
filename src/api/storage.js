export function routes (app, storage, config) {
  app.route('/record-stores')
    .get((req, res) => {
    })
    .post((req, res) => {
    })

  app.route('/record-stores/:id')
    .all(getRecordStoreForRequest)
    .get((req, res) => {
    })
    .patch((req, res) => {
    })
    .put((req, res) => {
    })
    .delete((req, res) => {
    })

  app.route('/record-stores/:recordStoreName/records')
    .all(getRecordStoreForRequest)
    .get((req, res) => {
    })
    .post((req, res) => {
    })

  app.route('/record-stores/:recordStoreName/records/:key')
    .all(getRecordForRequest)
    .get((req, res) => {
    })
    .patch((req, res) => {
    })
    .put((req, res) => {
    })
    .delete((req, res) => {
    })

  async function getRecordStoreForRequest (req, res, next) {
    const id = req.params.id

    try {
      const store = await storage.getRecordStore(id)
      if (store) {
        req.recordStore = store
        next()
      } else {
        res.status(404).json({ error: 'not found', type: 'recordStore', id })
      }
    } catch (e) {
      next(e)
    }
  }

  async function getRecordForRequest (req, res, next) {
    const recordStoreId = req.params.recordStoreId
    const key = req.params.key

    try {
      const record = await storage.getRecordByKey(recordStoreId, key)
      if (record) {
        req.record = record
        next()
      } else {
        res.status(404).json({ error: 'not found', type: 'record', recordStoreId, key })
      }
    } catch (e) {
      next(e)
    }
  }
}
