import { open } from './db'
import { nullLogger } from '../loggers'
import { Storage } from './storage-class'

export async function setupStorage (file, bus, logger = nullLogger) {
  if (file === undefined) {
    throw new Error('must supply filename for sqlite database')
  }

  if (bus === undefined) {
    throw new Error('must provide a message bus')
  }

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
