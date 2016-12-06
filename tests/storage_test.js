import EventEmitter from 'events'
import test from 'blue-tape'
import { setupStorage } from '../storage'

const _testLogger = {
  debug: (...msg) => console.log(...msg),
  error: (...msg) => console.error(...msg),
  info: (...msg) => console.log(...msg)
}
const testLogger = undefined

const bus = new EventEmitter()
let storage

test.onFinish(() => storage.close())

test('can create an in-memory database and a bunch of tables', async t => {
  try {
    storage = await setupStorage(':memory:', bus, testLogger)
    t.pass('worked')

    const result = await storage.getAllRecordStores()
    t.deepEqual(result, [], 'recordStores is there, but empty')
  } catch (e) {
    t.fail(`threw up: ${e}`)
  }
})

test('recordStores create', async t => {
  const createdStore = await storage.createRecordStore({ name: 'items', keyPath: 'id' })
  const fetchedStore = await storage.getRecordStore('items')

  t.deepEqual(createdStore, fetchedStore, 'created and fetched are the same')
})

test('recordStores all', async t => {
  const stores = await storage.getAllRecordStores()

  t.equal(stores.length, 1, 'there is a record store')
  t.equal(stores[0].name, 'items', 'there is an items store')
})

test('recordStores get', async t => {
  const store = await storage.getRecordStore('items')

  t.equal(store.keyPath, 'id')
  t.equal(store.generation, 1)
})

test('records create', async t => {
  const data = {
    id: '1',
    name: 'Khaled',
    shelf: 'top',
    best: true,
    keywords: ['we the best', 'lion']
  }

  const createdRecord = await storage.createRecord('items', data)

  const fetchedRecord = await storage.getRecord('items', '1')

  t.deepEqual(fetchedRecord.data, data, 'data was persisted')
  t.deepEqual(createdRecord, fetchedRecord, 'created and fetched are the same')
})

test('records all', async t => {
  const records = await storage.getAllRecords('items')

  t.equal(records.length, 1, 'there is a record')
  t.equal(records[0].data.name, 'Khaled', 'there is a DJ')
})

test('records alive', async t => {
  await storage.createRecord('items', {
    id: '2',
    name: 'Pac',
    shelf: 'top',
    best: true,
    keywords: ['The Message']
  })

  await storage.markRecordAsDead('items', '2')

  const allRecords = await storage.getAllRecords('items')
  const aliveRecords = await storage.getAliveRecords('items')

  t.notDeepEqual(allRecords, aliveRecords, 'alive returns a different set of records from all')
  t.equal(aliveRecords.length, 1, 'one alive record')
  t.equal(allRecords.length, 2, 'two total records')
})

test('records all since', async t => {
  const store = await storage.getRecordStore('items')
  const startGeneration = store.generation

  const record = await storage.createRecord('items', {
    id: 'future',
    name: 'The',
    shelf: 'middle',
    best: false
  })

  t.ok(record.generation > startGeneration, 'future record is forward in time')

  const futureRecords = await storage.getAllRecordsSince('items', startGeneration)
  const allRecords = await storage.getAllRecords('items')

  t.equal(futureRecords.length, 1)
  t.equal(allRecords.length, 3)
})

test('records update', async t => {
  const record = await storage.createRecord('items', { id: 'mc', name: 'McGovenor', shelf: 'middle' })
  t.ok(record, 'created a record to update')

  const generation = record.generation

  const updatedRecord = await storage.updateRecord('items', { id: 'mc', name: 'McGyver', shelf: 'middle' })
  t.ok(updatedRecord)

  t.equal(updatedRecord.startGeneration, generation, 'startGeneration knows where time started')
  t.equal(updatedRecord.generation, generation + 1, 'generation moved forward in time')
  t.ok(record.updatedAt < updatedRecord.updatedAt, 'updatedAt was updated')
})

test('records delete', async t => {
  const record = await storage.createRecord('items', { id: 'not-for-long' })
  t.ok(record, 'created a temporary record')

  await storage.deleteRecord('items', 'not-for-long')

  const notFound = await storage.getRecord('items', 'not-for-long')
  t.notOk(notFound)
})

test('indexes create', async t => {
  const createdIndex = await storage.createIndex({ recordStoreName: 'items', keyPath: 'shelf' })
  const fetchedIndex = await storage.getIndex('items', 'shelf')

  t.deepEqual(createdIndex, fetchedIndex, 'created and fetched are the same')
})

test('indexes all', async t => {
  const indexes = await storage.getAllIndexes('items')

  t.equal(indexes.length, 1, 'there is an index')
  t.equal(indexes[0].keyPath, 'shelf', 'there is an index on shelf')
})

test('indexes get', async t => {
  const index = await storage.getIndex('items', 'shelf')

  t.equal(index.keyPath, 'shelf')
  t.equal(index.isUnique, false)
})

test('existing records are indexed', async t => {
  const records = await storage.getAllRecordsByIndex('items', 'shelf')
  t.equal(records.length, 4)
})

test('new records are indexed', async t => {
  const newRecord = await storage.createRecord('items', {
    id: 'batman',
    shelf: 'bottom'
  })

  const indexedRecords = await storage.getAllRecordsByIndex('items', 'shelf')
  const batman = indexedRecords.find(record => record.id === newRecord.id)

  t.ok(batman, 'found batman in the shelf index')
})

test('updated records update their indexes', async t => {
  const updatedBatman = await storage.updateRecord('items', { id: 'batman', noShelf: 'anymore' })

  const indexedRecords = await storage.getAllRecordsByIndex('items', 'shelf')
  const noBatman = indexedRecords.find(record => record.id === updatedBatman.id)

  t.notOk(noBatman, 'batman was removed from the shelf index')
})

test('deleted records are deleted from the indexes', async t => {
  const indexedRecords = await storage.getAllRecordsByIndex('items', 'shelf')
  const future = indexedRecords.find(record => record.key === 'future')
  t.ok(future, 'future is currently in the index')

  const result = await storage.deleteRecord('items', 'future')
  t.ok(result, 'future has been deleted')

  const newestIndexedRecords = await storage.getAllRecordsByIndex('items', 'shelf')
  const noFuture = newestIndexedRecords.find(record => record.key === 'future')
  t.notOk(noFuture, 'future has been removed from the indexes')
})

// test('filter indexed records')
