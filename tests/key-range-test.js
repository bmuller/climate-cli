import { test } from './helper'
import { KeyRange } from '../src/storage/key-range'

test('filter indexed records', ['storage'], async t => {
  const storage = t.storage

  await storage.createRecordStore({ name: 'letters', keyPath: 'id' })
  await storage.createIndex({ recordStoreName: 'letters', keyPath: 'letter' })

  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')

  for (let i in alphabet) {
    const letter = alphabet[i]
    await storage.createRecord('letters', { id: i, letter })
  }

  t.test('equalTo', async t => {
    const range = KeyRange.equalTo('x')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 1, 'one record has the letter x')
  })

  t.test('lessThan', async t => {
    const range = KeyRange.lessThan('h')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 7, 'seven letters are before h')
  })

  t.test('lessThanOrEqualTo', async t => {
    const range = KeyRange.lessThanOrEqualTo('h')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 8, 'eight letters are before h, including h itself')
  })

  t.test('greaterThan', async t => {
    const range = KeyRange.greaterThan('x')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 2, 'two letters are after x')
  })

  t.test('greaterThanOrEqualTo', async t => {
    const range = KeyRange.greaterThanOrEqualTo('x')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 3, 'three letters are after x, including x itself')
  })

  t.test('between', async t => {
    const range = KeyRange.between('c', 'g')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 3, 'three letters are between c and g')
  })

  t.test('betweenIncludingBoth', async t => {
    const range = KeyRange.betweenIncludingBoth('c', 'g')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 5, 'five letters are between c and g, including both c and g')
  })

  t.test('betweenIncludingLeft', async t => {
    const range = KeyRange.betweenIncludingLeft('c', 'g')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 4, 'four letters are between c and g, including c only')
  })

  t.test('betweenIncludingRight', async t => {
    const range = KeyRange.betweenIncludingRight('c', 'i')
    const records = await storage.getAllRecordsByIndex('letters', 'letter', range)

    t.equal(records.length, 6, 'six letters are between c and i, including i only')
  })
})
