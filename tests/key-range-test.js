import { test } from './helper'
import { KeyRange } from '../src/storage/key-range'

async function setup (t) {
  await t.storage.createRecordStore({ name: 'letters', keyPath: 'id' })
  await t.storage.createIndex({ recordStoreName: 'letters', keyPath: 'letter' })

  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  let i = 0

  for (const letter of alphabet) {
    i += 1
    await t.storage.createRecord('letters', { id: i, letter })
  }
}

test('primary key equalTo', ['storage'], async t => {
  await setup(t)

  const range = KeyRange.equalTo(2)
  const records = await t.storage.getRecordsByKey('letters', range)

  t.equal(records.length, 1, 'one record has the id 2')
  t.equal(records[0].key, '2', 'the record with the id 2 is the first record')
  t.equal(records[0].data.letter, 'b', 'record 2 is b')
})

test('primary key lessThan', ['storage'], async t => {
  await setup(t)

  const range = KeyRange.lessThan(4)
  const records = await t.storage.getRecordsByKey('letters', range)

  t.equal(records.length, 3, 'three records have an id less than 4')
})

test('index equalTo', async t => {
  const range = KeyRange.equalTo('x')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 1, 'one record has the letter x')
})

test('index lessThan', async t => {
  const range = KeyRange.lessThan('h')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 7, 'seven letters are before h')
})

test('index lessThanOrEqualTo', async t => {
  const range = KeyRange.lessThanOrEqualTo('h')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 8, 'eight letters are before h, including h itself')
})

test('index greaterThan', async t => {
  const range = KeyRange.greaterThan('x')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 2, 'two letters are after x')
})

test('index greaterThanOrEqualTo', async t => {
  const range = KeyRange.greaterThanOrEqualTo('x')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 3, 'three letters are after x, including x itself')
})

test('index between', async t => {
  const range = KeyRange.between('c', 'g')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 3, 'three letters are between c and g')
})

test('index betweenIncludingBoth', async t => {
  const range = KeyRange.betweenIncludingBoth('c', 'g')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 5, 'five letters are between c and g, including both c and g')
})

test('index betweenIncludingLeft', async t => {
  const range = KeyRange.betweenIncludingLeft('c', 'g')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 4, 'four letters are between c and g, including c only')
})

test('index betweenIncludingRight', async t => {
  const range = KeyRange.betweenIncludingRight('c', 'i')
  const records = await t.storage.getRecordsByIndex('letters', 'letter', range)

  t.equal(records.length, 6, 'six letters are between c and i, including i only')
})
