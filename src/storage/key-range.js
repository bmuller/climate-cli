import { Key } from './key'

class KeyRangeBound {
  constructor (value, isIncluded) {
    this.value = Key.key(value)
    this.isIncluded = isIncluded
  }

  // TODO: make sure < works with all data types
  isLessThan (value) {
    value = Key.key(value)

    return this.value === Key.any ||
      (this.isIncluded && this.value.encoded() <= value.encoded()) ||
      (this.value.encoded() < value.encoded())
  }

  // TODO: make sure > works with all data types
  isGreaterThan (value) {
    value = Key.key(value)

    return this.value === Key.any ||
      (this.isIncluded && this.value.encoded() >= value.encoded()) ||
      (this.value.encoded() > value.encoded())
  }
}

KeyRangeBound.any = new KeyRangeBound(Key.any)

export class KeyRange {
  constructor (lowerBound, upperBound) {
    this.lowerBound = lowerBound
    this.upperBound = upperBound
  }

  includes (value) {
    return this.lowerBound.isLessThan(value) && this.upperBound.isGreaterThan(value)
  }
}

KeyRange.any = new KeyRange(KeyRangeBound.any, KeyRangeBound.any)

KeyRange.only = value => {
  const bound = new KeyRangeBound(value, true)
  return new KeyRange(bound, bound)
}

KeyRange.upperBound = (value, including = false) => {
  const lowerBound = KeyRangeBound.any
  const upperBound = new KeyRangeBound(value, including)
  return new KeyRange(lowerBound, upperBound)
}

KeyRange.lowerBound = (value, including = false) => {
  const lowerBound = new KeyRangeBound(value, including)
  const upperBound = KeyRangeBound.any
  return new KeyRange(lowerBound, upperBound)
}

KeyRange.bound = (lowerValue, upperValue, includingLowerValue = false, includingUpperValue = false) => {
  const lowerBound = new KeyRangeBound(lowerValue, includingLowerValue)
  const upperBound = new KeyRangeBound(upperValue, includingUpperValue)
  return new KeyRange(lowerBound, upperBound)
}

KeyRange.equalTo = KeyRange.only

KeyRange.lessThan = value => {
  return KeyRange.upperBound(value, false)
}

KeyRange.lessThanOrEqualTo = value => {
  return KeyRange.upperBound(value, true)
}

KeyRange.greaterThan = value => {
  return KeyRange.lowerBound(value, false)
}

KeyRange.greaterThanOrEqualTo = value => {
  return KeyRange.lowerBound(value, true)
}

KeyRange.between = (left, right) => {
  return KeyRange.bound(left, right, false, false)
}

KeyRange.betweenIncludingBoth = (left, right) => {
  return KeyRange.bound(left, right, true, true)
}

KeyRange.betweenIncludingLeft = (left, right) => {
  return KeyRange.bound(left, right, true, false)
}

KeyRange.betweenIncludingRight = (left, right) => {
  return KeyRange.bound(left, right, false, true)
}

const baseSQLForIndex = 'SELECT recordId from indexedRecords WHERE indexId = ?'
Object.freeze(baseSQLForIndex)

const baseSQLForRecordStore = 'WHERE recordStoreName = ?'
Object.freeze(baseSQLForRecordStore)

KeyRange.toSQL = function (indexOrStore, range) {
  if (indexOrStore.name) {
    return keyRangeForRecordStoreToSQL(indexOrStore, range)
  } else if (indexOrStore.recordStoreName) {
    return keyRangeForIndexToSQL(indexOrStore, range)
  } else {
    throw new Error('Only generates SQL for indexes or record stores')
  }
}

function keyRangeForIndexToSQL (index, range) {
  if (range === KeyRange.any) {
    return [`WHERE id IN (${baseSQLForIndex})`, index.id]
  } else {
    const [andSQL, ...values] = keyRangeToSQL(range)
    const encodedValues = values.map(value => Key.key(value).encoded())
    return [`WHERE id IN (${baseSQLForIndex} ${andSQL})`, index.id, ...encodedValues]
  }
}

function keyRangeForRecordStoreToSQL (store, range) {
  if (range === KeyRange.any) {
    return [baseSQLForRecordStore, store.name]
  } else {
    const [andSQL, ...values] = keyRangeToSQL(range)
    const encodedValues = values.map(value => Key.key(value).encoded())
    return [`${baseSQLForRecordStore} ${andSQL}`, store.name, ...encodedValues]
  }
}

function keyRangeToSQL (range) {
  if (range.lowerBound === range.upperBound) {
    const sql = 'AND key = ?'
    return [sql, range.lowerBound.value]
  } else if (range.lowerBound === KeyRangeBound.any) {
    const upperOperator = operatorForKeyBound('>', range.upperBound)
    const sql = `AND ? ${upperOperator} key`
    return [sql, range.upperBound.value]
  } else if (range.upperBound === KeyRangeBound.any) {
    const lowerOperator = operatorForKeyBound('<', range.lowerBound)
    const sql = `AND ? ${lowerOperator} key`
    return [sql, range.lowerBound.value]
  } else {
    const lowerOperator = operatorForKeyBound('<', range.lowerBound)
    const upperOperator = operatorForKeyBound('>', range.upperBound)
    const sql = `AND ? ${lowerOperator} key AND ? ${upperOperator} key`
    return [sql, range.lowerBound.value, range.upperBound.value]
  }
}

function operatorForKeyBound (op, bound) {
  if (bound.isIncluded) {
    return `${op}=`
  } else {
    return op
  }
}
