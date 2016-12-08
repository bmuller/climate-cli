import { test } from './helper'
import uuid from 'uuid'

async function setup (t) {
  await t.storage.createRecordStore({ name: 'lists', keyPath: 'id' })
  await t.storage.createRecordStore({ name: 'items', keyPath: 'id' })
  await t.storage.createIndex({ recordStoreName: 'items', keyPath: 'listId' })

  const list = await createList(t, 'Groceries')

  await createItem(t, list.key, 'Milk')
  await createItem(t, list.key, 'Coffee')
  await createItem(t, list.key, 'Bread')
}

function createList (t, title) {
  return t.storage.createRecord('lists', { id: uuid(), title })
}

function createItem (t, listId, title) {
  return t.storage.createRecord('items', {
    id: uuid(),
    listId,
    title
  })
}

test('can get changes from the beginning of time', ['storage'], async t => {
  await setup(t)

  const changes = await t.storage.getAllChangesSince('items', 0)

  t.equal(changes.length, 3, 'there have been a total of three changes so far')
  t.deepEqual(changes.map(c => c.type), ['create', 'create', 'create'], 'all three changes were creates')
})

test('can get changes from a point in time', ['storage'], async t => {
  await setup(t)

  const eggs = await createItem(t, 'Eggs')
  const pencil = await createItem(t, 'Pencil')

  const store = await t.storage.getRecordStore('items')
  t.equal(store.generation, 6, 'generation is at 6 after intial setup')

  await t.storage.markRecordAsDead('items', eggs.key)

  const updatedData = Object.assign({}, pencil.data, { title: 'Pen' })
  await t.storage.updateRecord('items', updatedData)

  const changes = await t.storage.getAllChangesSince('items', 6)

  t.equal(changes.length, 2, 'there have been 2 changes since initial setup')
  t.deepEqual(changes.map(c => c.type), ['delete', 'update'])
})

test('a create and then update is still a create', ['storage'], async t => {
  await setup(t)

  const store = await t.storage.getRecordStore('items')
  t.equal(store.generation, 4, 'generation is at 4 after intial setup')

  const pencil = await createItem(t, 'Pencil')
  const updatedData = Object.assign({}, pencil.data, { title: 'Pen' })
  await t.storage.updateRecord('items', updatedData)

  const changes = await t.storage.getAllChangesSince('items', 4)

  t.equal(changes.length, 1, 'there has been 1 change since initial setup')
  t.deepEqual(changes.map(c => c.type), ['create'])
})

test("a create and a delete isn't returned as a change", ['storage'], async t => {
  await setup(t)

  const store = await t.storage.getRecordStore('items')
  t.equal(store.generation, 4, 'generation is at 4 after intial setup')

  const pencil = await createItem(t, 'Pencil')
  await t.storage.markRecordAsDead('items', pencil.key)

  const changes = await t.storage.getAllChangesSince('items', 4)

  t.equal(changes.length, 0, "there haven't been any changes, because the new record was deleted before we ever saw it")
})
