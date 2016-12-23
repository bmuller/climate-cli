import { nullLogger } from '../loggers'
import * as utils from './utils'
import { KeyRange, keyRangeToSQL } from './key-range'

export class Storage {
  constructor (db, bus, logger = nullLogger) {
    this._db = db
    this._bus = bus
    this._logger = logger
  }

  close () {
    return this._db.close()
  }

  async createRecordStore ({ name, keyPath, isAutoIncrement = false }) {
    if (utils.isNotValidName(name)) {
      throw new Error('invalid record store name')
    }

    if (utils.isNotValidName(keyPath)) {
      throw new Error('invalid record store keyPath')
    }

    const info = {
      name,
      keyPath,
      isAutoIncrement
    }

    await this._db.insert('recordStores', info)

    return this.getRecordStore(name)
  }

  async getRecordStore (name) {
    const store = await this._db.get('recordStores', 'WHERE name = ?', name)
    return utils.formatRecordStore(store)
  }

  async getAllRecordStores () {
    const stores = await this._db.all('recordStores', 'ORDER BY name ASC')
    return stores.map(utils.formatRecordStore)
  }

  async createIndex ({ recordStoreName, keyPath, unique = false, multi = false }) {
    if (utils.isNotValidName(keyPath)) {
      throw new Error('invalid index keyPath')
    }

    const isUnique = unique ? 1 : 0
    const isMulti = multi ? 1 : 0

    let index

    await this._db.exclusiveLock(async () => {
      const store = await this.getRecordStore(recordStoreName)

      if (!store) { throw new Error(`cannot find store '${recordStoreName}'`) }

      const indexId = await this._db.insert('indexes', {
        recordStoreName,
        keyPath,
        isUnique,
        isMulti
      })

      index = await this.getIndexById(indexId)

      let records = await this.getAllRecords(store.name)
      let promises = records.map(record => utils.indexRecordForIndex(this, record, index))
      await Promise.all(promises)
    })

    return index
  }

  async getIndexById (id) {
    const index = await this._db.get('indexes', 'WHERE id = ?', id)
    return utils.formatIndex(index)
  }

  async getIndex (recordStoreName, keyPath) {
    const index = await this._db.get('indexes', 'WHERE recordStoreName = ? AND keyPath = ?', recordStoreName, keyPath)
    return utils.formatIndex(index)
  }

  async getAllIndexes (recordStoreName) {
    const indexes = await this._db.all('indexes', 'WHERE recordStoreName = ?', recordStoreName)
    return indexes.map(utils.formatIndex)
  }

  async createRecord (recordStoreName, data) {
    let record

    const json = JSON.stringify(data)

    await this._db.exclusiveLock(async () => {
      let store = await this.getRecordStore(recordStoreName)

      if (!store) { throw new Error(`cannot find store '${recordStoreName}'`) }

      const generation = store.generation + 1

      await this._db.update('recordStores', { generation }, 'WHERE name = ?', store.name)

      const recordKey = data[store.keyPath]

      const recordId = await this._db.insert('records', {
        recordStoreName,
        generation,
        startGeneration: generation,
        key: recordKey,
        json
      })

      record = await this.getRecordById(recordId)

      await utils.indexRecord(this, record)
    })

    return record
  }

  async updateRecord (recordStoreName, data) {
    let record

    const json = JSON.stringify(data)

    await this._db.exclusiveLock(async () => {
      let store = await this.getRecordStore(recordStoreName)

      const generation = store.generation + 1

      await this._db.update('recordStores', { generation }, 'WHERE name = ?', store.name)

      const recordKey = data[store.keyPath]

      await this._db.update('records', { generation, json, updatedAt: utils.now() }, 'WHERE recordStoreName = ? AND key = ?', recordStoreName, recordKey)

      record = await this.getRecord(recordStoreName, recordKey)

      await utils.indexRecord(this, record)
    })

    return record
  }

  async markRecordAsDead (recordStoreName, key) {
    let record

    await this._db.exclusiveLock(async () => {
      let store = await this.getRecordStore(recordStoreName)

      const generation = store.generation + 1

      await this._db.update('recordStores', { generation }, 'WHERE name = ?', store.name)

      await this._db.update('records', { generation, deletedAt: utils.now() }, 'WHERE recordStoreName = ? AND key = ?', recordStoreName, key)

      record = this.getRecord(recordStoreName, key)

      await utils.indexRecord(this, record)
    })

    return record
  }

  async deleteRecord (recordStoreName, key) {
    const record = await this._db.get('records', 'WHERE recordStoreName = ? AND key = ?', recordStoreName, key)

    await this._db.exclusiveLock(async () => {
      await this._db.delete('records', 'WHERE id = ?', record.id)
      await this._db.delete('indexedRecords', 'WHERE recordId = ?', record.id)
    })

    return true
  }

  async getRecordById (id) {
    const record = await this._db.get('records', 'WHERE id = ?', id)
    return utils.formatRecord(record)
  }

  async getRecord (recordStoreName, key) {
    const record = await this._db.get('records', 'WHERE recordStoreName = ? AND key = ?', recordStoreName, key)
    return utils.formatRecord(record)
  }

  async getAllRecords (recordStoreName) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ?', recordStoreName)
    return records.map(utils.formatRecord)
  }

  async getAliveRecords (recordStoreName) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ? AND deletedAt IS NULL', recordStoreName)
    return records.map(utils.formatRecord)
  }

  async getAllRecordsSince (recordStoreName, generation) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ? AND generation > ?', recordStoreName, generation)
    return records.map(utils.formatRecord)
  }

  async getAllChangesSince (recordStoreName, generation) {
    const records = await this.getAllRecordsSince(recordStoreName, generation)
    return records
      .map(record => utils.changeForRecord(record, generation))
      .filter(change => change.type !== 'null') // remove noop changes
  }

  async getAllRecordsByIndex (recordStoreName, keyPath, range = KeyRange.any) {
    const index = await this.getIndex(recordStoreName, keyPath)

    if (!index) {
      throw new Error(`${keyPath} is not an indexed keyPath for ${recordStoreName}`)
    }

    const [innerSQL, ...params] = keyRangeToSQL(index, range)

    const records = await this._db.all('records', `WHERE id IN (${innerSQL})`, ...params)
    return records.map(utils.formatRecord)
  }

  // NOTE: callbacks for eachRecord cannot perform SQL statements - this is a limitation of the sqlite3 library
  eachRecord (recordStoreName, cb) {
    return this._db.each('records', 'WHERE recordStoreName = ?', recordStoreName, _record => {
      const record = utils.formatRecord(_record)
      return cb(record)
    })
  }

  async migrate () {
    throw new Error('not implemented')
  }
}
