import { open } from './db'
import { nullLogger } from '../null-logger'

const nameRegexp = /^[a-zA-Z][a-zA-Z0-9-_]+$/

function now() {
  return (new Date().getTime()) / 1000.0
}

class Storage {
  constructor (db, bus, logger = nullLogger) {
    this._db = db
    this._bus = bus
    this._logger = logger
  }

  close () {
    return this._db.close()
  }

  async createRecordStore ({ name, keyPath, isAutoIncrement = false }) {
    if (!nameRegexp.exec(name)) {
      throw new Error('invalid record store name')
    }

    if (!nameRegexp.exec(keyPath)) {
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
    return formatRecordStore(store)
  }

  async getAllRecordStores () {
    const stores = await this._db.all('recordStores', 'ORDER BY name ASC')
    return stores.map(formatRecordStore)
  }

  async createIndex ({ recordStoreName, keyPath, unique = false, multi = false }) {
    if (!nameRegexp.exec(keyPath)) {
      throw new Error('invalid index keyPath')
    }

    const isUnique = unique ? 1 : 0
    const isMulti = multi ? 1 : 0

    let index

    await this._db.exclusiveLock(async () => {
      const store = await this.getRecordStore(recordStoreName)

      const indexId = await this._db.insert('indexes', {
        recordStoreName,
        keyPath,
        isUnique,
        isMulti
      })

      index = await this.getIndexById(indexId)

      // Must fill in index from existing records

      await this.eachRecord(store.name, record => indexRecordForIndex(this, record, index))

      // TODO: implement this._db.each instead of loading all into memory
      // let records = await this.getAllRecords(store.name)
      //
      // let promises = records.map(record => indexRecordForIndex(this, record, index))
      // await Promise.all(promises)
    })

    return index
  }

  async getIndexById (id) {
    const index = await this._db.get('indexes', 'WHERE id = ?', id)
    return formatIndex(index)
  }

  async getIndex (recordStoreName, keyPath) {
    const index = await this._db.get('indexes', 'WHERE recordStoreName = ? AND keyPath = ?', recordStoreName, keyPath)
    return formatIndex(index)
  }

  async getAllIndexes (recordStoreName) {
    const indexes = await this._db.all('indexes', 'WHERE recordStoreName = ?', recordStoreName)
    return indexes.map(formatIndex)
  }

  async createRecord (recordStoreName, data) {
    let record

    const json = JSON.stringify(data)

    await this._db.exclusiveLock(async () => {
      let store = await this.getRecordStore(recordStoreName)

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

      await indexRecord(this, record)
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

      await this._db.update('records', { generation, json, updatedAt: now() }, 'WHERE recordStoreName = ? AND key = ?', recordStoreName, recordKey)

      record = await this.getRecord(recordStoreName, recordKey)

      await indexRecord(this, record)
    })

    return record
  }

  async markRecordAsDead (recordStoreName, key) {
    let record

    await this._db.exclusiveLock(async () => {
      let store = await this.getRecordStore(recordStoreName)

      const generation = store.generation + 1

      await this._db.update('recordStores', { generation }, 'WHERE name = ?', store.name)

      await this._db.update('records', { generation, deletedAt: now() }, 'WHERE recordStoreName = ? AND key = ?', recordStoreName, key)

      record = this.getRecord(recordStoreName, key)

      await indexRecord(this, record)
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
    return formatRecord(record)
  }

  async getRecord (recordStoreName, key) {
    const record = await this._db.get('records', 'WHERE recordStoreName = ? AND key = ?', recordStoreName, key)
    return formatRecord(record)
  }

  async getAllRecords (recordStoreName) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ?', recordStoreName)
    return records.map(formatRecord)
  }

  async getAliveRecords (recordStoreName) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ? AND deletedAt IS NULL', recordStoreName)
    return records.map(formatRecord)
  }

  async getAllRecordsSince (recordStoreName, generation) {
    const records = await this._db.all('records', 'WHERE recordStoreName = ? AND generation > ?', recordStoreName, generation)
    return records.map(formatRecord)
  }

  async getAllRecordsByIndex (recordStoreName, keyPath) {
    const index = await this.getIndex(recordStoreName, keyPath)

    if (!index) {
      throw new Error(`${keyPath} is not an indexed keyPath for ${recordStoreName}`)
    }

    const records = await this._db.all('records', 'WHERE id IN (SELECT recordId from indexedRecords WHERE indexId = ?)', index.id)
    return records.map(formatRecord)
  }

  eachRecord (recordStoreName, cb) {
    return this._db.each('records', 'WHERE recordStoreName = ?', recordStoreName, _record => {
      const record = formatRecord(_record)
      return cb(record)
    })
  }
}

async function indexRecord (storage, record) {
  const indexes = await storage.getAllIndexes(record.recordStoreName)
  const promises = indexes.map(index => indexRecordForIndex(storage, record, index))
  await Promise.all(promises)
}

// TODO: bad name
async function indexRecordForIndex (storage, record, index) {
  const value = record.data[index.keyPath] // TODO: support nested keys (foo.bar)

  if (value === undefined) {
    await storage._db.delete('indexedRecords', 'WHERE recordId = ? AND indexId = ?', record.id, index.id)
  } else {
    // TODO: test for uniqueness if isUnique
    // TODO: implement multi if isMulti
    await storage._db.insert('indexedRecords', {
      indexId: index.id,
      recordId: record.id,
      value
    })
  }
}

function formatRecordStore (store) {
  if (store === undefined) { return store }

  store.isAutoIncrement = store.isAutoIncrement === 1
  return store
}

function formatIndex (index) {
  if (index === undefined) { return index }

  index.isUnique = index.isUnique === 1
  index.isMulti = index.isMulti === 1
  return index
}

function formatRecord (record) {
  if (record === undefined) { return record }

  record.data = JSON.parse(record.json)

  delete record.json

  return record
}

export async function setupStorage (file, bus, logger = nullLogger) {
  const db = await open(file, logger)

  await db.exclusiveLock(async () => {
    await db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        createdAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real')
      )
    `)

    await db.run(`
      CREATE TABLE IF NOT EXISTS recordStores (
        name TEXT PRIMARY KEY NOT NULL,
        keyPath TEXT NOT NULL,
        isAutoIncrement INTEGER NOT NULL DEFAULT 0 CHECK (isAutoIncrement = 0 OR isAutoIncrement = 1),
        generation INTEGER NOT NULL DEFAULT 1 CHECK (typeof(generation) = 'integer'),
        createdAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real')
      )
    `)

    await db.run(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        recordStoreName TEXT NOT NULL REFERENCES recordStores(name),
        startGeneration INTEGER NOT NULL CHECK (typeof(generation) = 'integer'),
        generation INTEGER NOT NULL CHECK (typeof(generation) = 'integer'),
        key TEXT NOT NULL,
        json TEXT NOT NULL,
        createdAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real'),
        updatedAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real'),
        deletedAt REAL CHECK (createdAt IS NULL OR typeof(createdAt) = 'real')
      )
    `)

    await db.run(`
      CREATE TABLE IF NOT EXISTS indexes (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        recordStoreName TEXT NOT NULL REFERENCES recordStores(name),
        keyPath TEXT NOT NULL,
        isUnique INTEGER NOT NULL DEFAULT 0 CHECK (isUnique = 0 OR isUnique = 1),
        isMulti INTEGER NOT NULL DEFAULT 0 CHECK (isMulti = 0 OR isMulti = 1),
        createdAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real')
      )
    `)

    await db.run(`
      CREATE TABLE IF NOT EXISTS indexedRecords (
        indexId INTEGER NOT NULL REFERENCES indexes(id),
        recordId INTEGER NOT NULL REFERENCES records(id),
        value TEXT NOT NULL,
        createdAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real'),
        updatedAt REAL NOT NULL DEFAULT ((julianday('now') - 2440587.5) * 86400.0) CHECK (typeof(createdAt) = 'real')
      )
    `)
  })

  const storage = new Storage(db, bus, logger)

  return storage
}
