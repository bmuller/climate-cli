import { encodeKey, decodeKey } from './key-utils'

class KeyInvalid extends Error {}

export class Key {
  constructor (value) {
    this.value = value
    Object.freeze(this)

    if (!Key.isValid(value)) {
      throw new KeyInvalid()
    }
  }

  encoded () {
    return encodeKey(this.value)
  }
}

Key.decode = string => {
  const value = decodeKey(string)
  return new Key(value)
}

Key.isValid = obj => {
  return Key.isNumber(obj) ||
         Key.isString(obj) ||
         Key.isDate(obj) ||
         Key.isValidArray(obj)
}

function all (arr) {
  return arr.every(value => !!value)
}

Key.isValidArray = obj => {
  return Key.isArray(obj) && all(obj.map(Key.isValid))
}

Key.isArray = obj => {
  return Array.isArray(obj)
}

Key.isDate = obj => {
  return obj instanceof Date && !isNaN(obj.valueOf())
}

Key.isString = obj => {
  return typeof obj === 'string' || obj instanceof String
}

Key.isNumber = obj => {
  return Number.isFinite(obj) || obj === Infinity
}

