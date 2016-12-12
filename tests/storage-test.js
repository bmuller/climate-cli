import { test } from './helper'

test('can create an in-memory database and a bunch of tables', ['storage'], async t => {
  const result = await t.storage.getAllRecordStores()
  t.deepEqual(result, [], 'recordStores table is there, but empty')
})

function createItemsStore (storage) {
  return storage.createRecordStore({ name: 'items', keyPath: 'id' })
}

test('recordStores create', ['storage'], async t => {
  const createdStore = await createItemsStore(t.storage)
  const fetchedStore = await t.storage.getRecordStore('items')

  t.deepEqual(createdStore, fetchedStore, 'created and fetched are the same')
})

test('recordStores all', ['storage'], async t => {
  await createItemsStore(t.storage)

  const stores = await t.storage.getAllRecordStores()

  t.equal(stores.length, 1, 'there is a record store')
  t.equal(stores[0].name, 'items', 'there is an items store')
})

test('recordStores get', ['storage'], async t => {
  await createItemsStore(t.storage)

  const store = await t.storage.getRecordStore('items')

  t.equal(store.keyPath, 'id')
  t.equal(store.generation, 1)
})

const testRecords = {
  dj: {
    id: 'dj',
    name: 'Khaled',
    shelf: 'top',
    best: true,
    keywords: ['we the best', 'lion']
  },
  2: {
    id: '2',
    name: 'Pac',
    shelf: 'top',
    best: true,
    keywords: ['The Message']
  },
  future: {
    id: 'future',
    name: 'The',
    shelf: 'middle',
    best: false
  },
  batman: {
    id: 'batman',
    shelf: 'bottom'
  }
}

function createTestRecord (storage, id) {
  const data = testRecords[id]
  return storage.createRecord('items', data)
}

async function createAllTestRecords (storage) {
  for (let id in testRecords) {
    const data = testRecords[id]
    await storage.createRecord('items', data)
  }
}

test('records create', ['storage'], async t => {
  await createItemsStore(t.storage)

  const createdRecord = await createTestRecord(t.storage, 'dj')
  const fetchedRecord = await t.storage.getRecord('items', 'dj')

  t.deepEqual(fetchedRecord.data, testRecords.dj, 'data was persisted')
  t.deepEqual(createdRecord, fetchedRecord, 'created and fetched are the same')
})

test('records all', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createAllTestRecords(t.storage)

  const records = await t.storage.getAllRecords('items')

  t.equal(records.length, 4, 'there are some records')
})

test('records alive', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createAllTestRecords(t.storage)

  await t.storage.markRecordAsDead('items', '2')

  const allRecords = await t.storage.getAllRecords('items')
  const aliveRecords = await t.storage.getAliveRecords('items')

  t.notDeepEqual(allRecords, aliveRecords, 'alive returns a different set of records from all')
  t.equal(aliveRecords.length, 3, 'one less alive record')
  t.equal(allRecords.length, 4, 'one more total records')
})

test('records all since', ['storage'], async t => {
  // generation starts at 1
  await createItemsStore(t.storage)

  // start with 1 existing record, generation will now be at 2
  await createTestRecord(t.storage, 'dj')

  // add a second record, generation will now be at 3
  const record = await createTestRecord(t.storage, 'future')

  t.equal(record.generation, 3, 'future record is forward in time')

  const futureRecords = await t.storage.getAllRecordsSince('items', 2)
  const allRecords = await t.storage.getAllRecords('items')

  t.equal(futureRecords.length, 1, 'one record is after 2')
  t.equal(allRecords.length, 2, 'there are two total records')
})

test('records each', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createAllTestRecords(t.storage)

  let ids = []

  await t.storage.eachRecord('items', item => {
    ids.push(item.data.id)
  })

  t.deepEqual(ids.sort(), ['2', 'batman', 'dj', 'future'], 'ids are correct')
})

test('records update', ['storage'], async t => {
  await createItemsStore(t.storage)
  const record = await createTestRecord(t.storage, 'dj')

  const generation = record.generation

  const updatedData = Object.assign({}, record.data, { name: 'Micro' })

  const updatedRecord = await t.storage.updateRecord('items', updatedData)
  t.ok(updatedRecord, 'returned the updated record')

  t.equal(updatedRecord.data.name, 'Micro', "updated the DJ's name to Micro")
  t.equal(updatedRecord.startGeneration, generation, 'startGeneration knows where time started')
  t.equal(updatedRecord.generation, generation + 1, 'generation moved forward in time')
  t.ok(record.updatedAt < updatedRecord.updatedAt, 'updatedAt was updated')
})

test('records delete', ['storage'], async t => {
  await createItemsStore(t.storage)

  const record = await t.storage.createRecord('items', { id: 'not-for-long' })
  t.ok(record, 'created a temporary record')

  await t.storage.deleteRecord('items', 'not-for-long')

  const notFound = await t.storage.getRecord('items', 'not-for-long')
  t.notOk(notFound)
})

function createShelfIndex (storage) {
  return storage.createIndex({ recordStoreName: 'items', keyPath: 'shelf' })
}

test('indexes create', ['storage'], async t => {
  await createItemsStore(t.storage)

  const createdIndex = await createShelfIndex(t.storage)
  const fetchedIndex = await t.storage.getIndex('items', 'shelf')

  t.deepEqual(createdIndex, fetchedIndex, 'created and fetched are the same')
})

test('indexes all', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createShelfIndex(t.storage)

  const indexes = await t.storage.getAllIndexes('items')

  t.equal(indexes.length, 1, 'there is an index')
  t.equal(indexes[0].keyPath, 'shelf', 'there is an index on shelf')
})

test('indexes get', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createShelfIndex(t.storage)

  const index = await t.storage.getIndex('items', 'shelf')

  t.equal(index.keyPath, 'shelf')
  t.equal(index.isUnique, false)
})

test('existing records are indexed', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createAllTestRecords(t.storage)
  await createShelfIndex(t.storage)

  const records = await t.storage.getRecordsByIndex('items', 'shelf')
  t.equal(records.length, 4)
})

test('new records are indexed', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createShelfIndex(t.storage)
  await createTestRecord(t.storage, 'batman')

  const indexedRecords = await t.storage.getRecordsByIndex('items', 'shelf')
  const batman = indexedRecords.find(record => record.key === 'batman')

  t.ok(batman, 'found batman in the shelf index')
})

test('updated records update their indexes', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createShelfIndex(t.storage)
  await createTestRecord(t.storage, 'batman')

  await t.storage.updateRecord('items', { id: 'batman', shelf: null })

  const indexedRecords = await t.storage.getRecordsByIndex('items', 'shelf')
  const noBatman = indexedRecords.find(record => record.key === 'batman')

  t.notOk(noBatman, 'batman was removed from the shelf index')
})

test('deleted records are deleted from the indexes', ['storage'], async t => {
  await createItemsStore(t.storage)
  await createShelfIndex(t.storage)
  await createAllTestRecords(t.storage)

  const indexedRecords = await t.storage.getRecordsByIndex('items', 'shelf')
  const future = indexedRecords.find(record => record.key === 'future')
  t.ok(future, 'future is currently in the index')

  const result = await t.storage.deleteRecord('items', 'future')
  t.ok(result, 'future has been deleted')

  const newestIndexedRecords = await t.storage.getRecordsByIndex('items', 'shelf')
  const noFuture = newestIndexedRecords.find(record => record.key === 'future')
  t.notOk(noFuture, 'future has been removed from the indexes')
})
