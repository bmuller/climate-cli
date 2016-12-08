const any = Object.create({})

class KeyRangeBound {
  constructor (value, isIncluded) {
    this.value = value
    this.isIncluded = isIncluded
  }

  // TODO: make sure < works with all data types
  isLessThan (value) {
    return this.value === any ||
      (this.isIncluded && this.value <= value) ||
      (this.value < value)
  }

  // TODO: make sure > works with all data types
  isGreaterThan (value) {
    return this.value === any ||
      (this.isIncluded && this.value >= value) ||
      (this.value > value)
  }
}

KeyRangeBound.any = new KeyRangeBound(any)

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

const anySQL = 'SELECT recordId from indexedRecords WHERE indexId = ?'

export function keyRangeToSQL (index, range) {
  if (range === KeyRange.any) {
    return [anySQL, index.id]
  } else if (range.lowerBound === range.upperBound) {
    const sql = `${anySQL} AND value = ?`
    return [sql, index.id, range.lowerBound.value]
  } else if (range.lowerBound === KeyRangeBound.any) {
    const upperOperator = operatorForKeyBound('>', range.upperBound)
    const sql = `${anySQL} AND ? ${upperOperator} value`
    return [sql, index.id, range.upperBound.value]
  } else if (range.upperBound === KeyRangeBound.any) {
    const lowerOperator = operatorForKeyBound('<', range.lowerBound)
    const sql = `${anySQL} AND ? ${lowerOperator} value`
    return [sql, index.id, range.lowerBound.value]
  } else {
    const lowerOperator = operatorForKeyBound('<', range.lowerBound)
    const upperOperator = operatorForKeyBound('>', range.upperBound)
    const sql = `${anySQL} AND ? ${lowerOperator} value AND ? ${upperOperator} value`
    return [sql, index.id, range.lowerBound.value, range.upperBound.value]
  }
}

function operatorForKeyBound (op, bound) {
  if (bound.isIncluded) {
    return `${op}=`
  } else {
    return op
  }
}
