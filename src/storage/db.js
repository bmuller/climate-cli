import process from 'process'
import sqlite3 from 'sqlite3'
import { nullLogger } from '../loggers'

const verboseSqlite3 = sqlite3.verbose()

export function open (file = ':memory:', logger = nullLogger) {
  return new Promise((resolve, reject) => {
    let isOpen = false

    const db = new verboseSqlite3.Database(file, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)

    db.on('profile', (sql, time) => {
      logger.debug(`sqlite3: statement '${sql}' took ${time}ms`)
    })

    db.on('open', () => {
      process.nextTick(() => resolve(new DB(db, logger)))
      isOpen = true
    })

    db.on('error', err => {
      console.error('db error', err)
      if (!isOpen) {
        process.nextTick(() => reject(err))
      }
    })
  })
}

class DB {
  constructor (_db, _logger = nullLogger) {
    this._db = _db
    this._logger = _logger
  }

  lock (cb) {
    return transaction('TRANSACTION', this._db, cb)
  }

  close () {
    return new Promise((resolve, reject) => {
      this._db.close(err => {
        if (err) {
          process.nextTick(() => reject(err))
        } else {
          process.nextTick(() => resolve())
        }
      })
    })
  }

  exclusiveLock (cb) {
    return transaction('EXCLUSIVE TRANSACTION', this, cb)
  }

  run (statement, ...params) {
    return new Promise((resolve, reject) => {
      try {
        this._logger.debug('sql run', statement, params)
        this._db.run(statement, ...params, function (err) {
          if (err) {
            process.nextTick(() => reject(err))
          } else {
            const changes = this.changes // may be undefined
            const lastID = this.lastID // may be undefined
            process.nextTick(() => resolve({ changes, lastID }))
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  async insert (table, data) {
    const columns = Object.keys(data).sort()

    let values = []
    let questionMarks = []
    for (let column of columns) {
      values.push(data[column])
      questionMarks.push('?')
    }

    const columnNames = columns.join(', ')
    questionMarks = questionMarks.join(', ')

    const statement = `INSERT INTO ${table} (${columnNames}) VALUES (${questionMarks})`

    const result = await this.run(statement, ...values)
    this._logger.debug('sql insert result', result)

    return result.lastID
  }

  async update (table, data, conditions, ...params) {
    const columns = Object.keys(data).sort()

    let sets = []
    let values = []
    for (let column of columns) {
      sets.push(`${column} = ?`)
      values.push(data[column])
    }

    const set = sets.join(', ')
    values = values.concat(params)

    const statement = `UPDATE ${table} SET ${set} ${conditions}`

    const result = await this.run(statement, ...values)
    this._logger.debug('sql update result', result)

    return result.changes
  }

  async delete (table, statement, ...params) {
    statement = `DELETE FROM ${table} ${statement}`

    const result = await this.run(statement, ...params)
    this._logger.debug('sql delete result', result)

    return result.changes
  }

  async get (table, statement, ...params) {
    statement = `SELECT * FROM ${table} ${statement}`
    return rawSelect(this._db, this._logger, 'get', statement, ...params)
  }

  async all (table, statement, ...params) {
    statement = `SELECT * FROM ${table} ${statement}`
    return rawSelect(this._db, this._logger, 'all', statement, ...params)
  }

  each (table, statement, ...params) {
    const cb = params.pop()
    statement = `SELECT * FROM ${table} ${statement}`

    let eachErr = null

    return new Promise((resolve, reject) => {
      try {
        this._logger.debug('sql select', statement, params)
        this._db.each(statement, ...params, (err, row) => {
          if (err) {
            eachErr = err
          } else {
            try {
              cb(row)
            } catch (e) {
              eachErr = e
              throw e
            }
          }
        }, (err, numberOfRows) => {
          if (err || eachErr) {
            process.nextTick(() => reject(err || eachErr))
          } else {
            process.nextTick(() => resolve(numberOfRows))
          }
        })
      } catch (e) {
        reject(e)
      }
    })
  }
}

function rawSelect (db, logger, type, statement, ...params) {
  return new Promise((resolve, reject) => {
    try {
      logger.debug('sql select', statement, params)
      db[type](statement, ...params, (err, result) => {
        if (err) {
          process.nextTick(() => reject(err))
        } else {
          process.nextTick(() => resolve(result))
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

async function transaction (type, db, cb) {
  try {
    await db.run(`BEGIN ${type}`)
    const result = await cb()
    await db.run('COMMIT')
    return result
  } catch (e) {
    try {
      await db.run('ROLLBACK')
      throw e
    } catch (err) {
      throw err
    }
  }
}

