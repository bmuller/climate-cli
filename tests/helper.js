import EventEmitter from 'events'
import tape from 'blue-tape'
import { setupStorage } from '../src/storage'
import { verboseLogger as logger } from '../src/loggers'

const testIncludes = {}

export function test (msg, includes, cb) {
  return tape(msg, t => innerTest(t, includes, cb))
}

test.only = (msg, includes, cb) => {
  return tape.only(msg, t => innerTest(t, includes, cb))
}

testIncludes['storage'] = function (cb) {
  return async t => {
    let storage
    try {
      const bus = new EventEmitter()
      storage = await setupStorage(':memory:', bus, logger)
      t.storage = storage
      return cb(t)
    } finally {
      try { storage.close() } catch (e) {}
    }
  }
}

function innerTest (t, includes, cb) {
  if (cb === undefined) {
    cb = includes
    includes = []
  }

  // innermost function just calls the root callback
  let fnBody = _t => cb(_t)

  for (let name of includes) {
    const fn = testIncludes[name]
    if (!fn) { throw new Error(`no test include named '${name}'`) }

    // wrap
    fnBody = fn(fnBody)
  }

  return fnBody(t) // cascade
}
