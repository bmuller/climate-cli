import { Key } from './key'

const nameRegexp = /^[a-zA-Z][a-zA-Z0-9-_]+$/

export function now () {
  return (new Date().getTime()) / 1000.0
}

export function isValidName (name) {
  return !!nameRegexp.exec(name)
}

export function isNotValidName (name) {
  return !isValidName(name)
}

export async function indexRecord (storage, record) {
  const indexes = await storage.getAllIndexes(record.recordStoreName)
  const promises = indexes.map(index => indexRecordForIndex(storage, record, index))
  await Promise.all(promises)
}

// TODO: bad name
export async function indexRecordForIndex (storage, record, index) {
  let key = record.data[index.keyPath] // TODO: support nested keys (foo.bar)

  if (key === undefined || key === null) {
    await storage._db.delete('indexedRecords', 'WHERE recordId = ? AND indexId = ?', record.id, index.id)
  } else {
    // TODO: test for uniqueness if isUnique
    // TODO: implement multi if isMulti

    key = Key.key(key)

    await storage._db.insert('indexedRecords', {
      indexId: index.id,
      recordId: record.id,
      key: key.encoded()
    })
  }
}

export function changeForRecord (record, sinceGeneration) {
  let type
  let data

  if (record.startGeneration === record.generation) {
    type = 'create'
    data = record.key
  } else if (record.deletedAt) {
    if (record.startGeneration > sinceGeneration) {
      type = 'null'
      data = null
    } else {
      type = 'delete'
      data = {}
    }
  } else {
    if (record.startGeneration > sinceGeneration) {
      type = 'create'
    } else {
      type = 'update'
    }
    data = record.key
  }

  return {
    type,
    data,
    recordStoreName: record.recordStoreName,
    key: record.key
  }
}

export function formatRecordStore (store) {
  if (store === undefined) { return store }

  store.isAutoIncrement = store.isAutoIncrement === 1
  return store
}

export function formatIndex (index) {
  if (index === undefined) { return index }

  index.isUnique = index.isUnique === 1
  index.isMulti = index.isMulti === 1
  return index
}

export function formatRecord (record) {
  if (record === undefined) { return record }

  record.key = Key.decode(record.key).value

  record.data = JSON.parse(record.json)

  delete record.json

  return record
}

