import { test } from './helper'
import { Key } from '../src/storage/key'

test('numbers are valid keys', async t => {
  t.ok(Key.isValid(1))
})

test('Infinity is a valid key', async t => {
  t.ok(Key.isValid(Infinity))
})

test('strings are valid keys', async t => {
  t.ok(Key.isValid('a'))
})

test('arrays are valid keys', async t => {
  t.ok(Key.isValid([1, 'a']))
})

test('empty arrays are valid keys', async t => {
  t.ok(Key.isValid([]))
})

test('encodes keys', async t => {
  // These values were produced from the production indexeddb shim and copied here for the tests
  t.equal('01bff0', (new Key(1)).encoded(), 'encoded 1 correctly')
  t.equal('0332', (new Key('1')).encoded(), 'encoded "1" correctly')
  t.equal('05bff000000000000001c00000000000000001c008', (new Key([1, 2, 3])).encoded(), 'encoded [1,2,3] correctly')
})

test('invalid keys throw', async t => {
  t.throws(() => {
    new Key(true) // eslint-disable-line no-new
  }, 'boolean keys throw')
})
