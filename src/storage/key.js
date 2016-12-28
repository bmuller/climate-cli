import { encodeKey, decodeKey } from './key-utils'

class KeyInvalid extends Error {}

export class Key {
  constructor (value) {
    this.isKey = true
    this.value = value
    this._encodedValue = undefined

    if (!Key.isValid(value)) {
      throw new KeyInvalid(`key ${JSON.stringify(value)} is invalid`)
    }
  }

  encoded () {
    if (!this._encodedValue) {
      this._encodedValue = encodeKey(this.value)
    }
    return this._encodedValue
  }
}

Key.key = value => {
  if (value === Key.any) {
    return Key.any
  } else if (value.isKey) {
    return value
  } else {
    return new Key(value)
  }
}

Key.any = Object.create({})

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

