// Copied from <https://github.com/facebookarchive/IndexedDB-polyfill/blob/master/key.js>

const ARRAY_TERMINATOR = { }
const BYTE_TERMINATOR = 0
const TYPE_NUMBER = 1
const TYPE_DATE = 2
const TYPE_STRING = 3
const TYPE_ARRAY = 4
const MAX_TYPE_BYTE_SIZE = 12 // NOTE: Cannot be greater than 255

export function encodeKey (key) {
  const stack = [key]
  const writer = new HexStringWriter()
  let type = 0
  let obj

  while ((obj = stack.pop()) !== undefined) {
    if (type % 4 === 0 && type + TYPE_ARRAY > MAX_TYPE_BYTE_SIZE) {
      writer.write(type)
      type = 0
    }

    let dataType = typeof obj

    if (obj instanceof Array) {
      type += TYPE_ARRAY

      if (obj.length > 0) {
        stack.push(ARRAY_TERMINATOR)
        var i = obj.length
        while (i--) stack.push(obj[i])
        continue
      } else {
        writer.write(type)
      }
    } else if (dataType === 'number') {
      type += TYPE_NUMBER
      writer.write(type)
      encodeNumber(writer, obj)
    } else if (obj instanceof Date) {
      type += TYPE_DATE
      writer.write(type)
      encodeNumber(writer, obj.valueOf())
    } else if (dataType === 'string') {
      type += TYPE_STRING
      writer.write(type)
      encodeString(writer, obj)
    } else if (obj === ARRAY_TERMINATOR) {
      writer.write(BYTE_TERMINATOR)
    } else {
      return null
    }

    type = 0
  }

  return writer.trim().toString()
}

export function decodeKey (encodedKey) {
  const reader = new HexStringReader(encodedKey)
  const rootArray = [] // one-element root array that contains the result
  const arrayStack = []
  let parentArray = rootArray

  let type
  let depth
  let tmp

  while (reader.read() != null) {
    if (reader.current === 0) { // end of array
      parentArray = arrayStack.pop()
      continue
    }

    if (reader.current === null) {
      return rootArray[0]
    }

    do {
      depth = reader.current / 4 | 0
      type = reader.current % 4

      for (let i = 0; i < depth; i++) {
        tmp = []
        parentArray.push(tmp)
        arrayStack.push(parentArray)
        parentArray = tmp
      }

      if (type === 0 && reader.current + TYPE_ARRAY > MAX_TYPE_BYTE_SIZE) {
        reader.read()
      } else {
        break
      }
    } while (true)

    if (type === TYPE_NUMBER) {
      parentArray.push(decodeNumber(reader))
    } else if (type === TYPE_DATE) {
      parentArray.push(new Date(decodeNumber(reader)))
    } else if (type === TYPE_STRING) {
      parentArray.push(decodeString(reader))
    } else if (type === 0) { // empty array case
      parentArray = arrayStack.pop()
    }
  }

  return rootArray[0]
}

const p16 = 0x10000
const p32 = 0x100000000
const p48 = 0x1000000000000
const p52 = 0x10000000000000
const pNeg1074 = 5e-324                      // 2^-1074
const pNeg1022 = 2.2250738585072014e-308     // 2^-1022

function ieee754 (number) {
  let s = 0
  let e = 0
  let m = 0

  if (number !== 0) {
    if (isFinite(number)) {
      if (number < 0) {
        s = 1
        number = -number
      }

      let p = 0

      if (number >= pNeg1022) {
        let n = number

        while (n < 1) {
          p--
          n *= 2
        }

        while (n >= 2) {
          p++
          n /= 2
        }

        e = p + 1023
      }

      m = e ? Math.floor((number / Math.pow(2, p) - 1) * p52) : Math.floor(number / pNeg1074)
    } else {
      e = 0x7FF

      if (isNaN(number)) {
        m = 2251799813685248 // QNan
      } else {
        if (number === -Infinity) s = 1
      }
    }
  }

  return { sign: s, exponent: e, mantissa: m }
}

function encodeNumber (writer, number) {
  number = ieee754(number)

  if (number.sign) {
    number.mantissa = p52 - 1 - number.mantissa
    number.exponent = 0x7FF - number.exponent
  }

  let word
  let m = number.mantissa

  writer.write((number.sign ? 0 : 0x80) | (number.exponent >> 4))
  writer.write((number.exponent & 0xF) << 4 | (0 | m / p48))

  m %= p48
  word = 0 | m / p32
  writer.write(word >> 8, word & 0xFF)

  m %= p32
  word = 0 | m / p16
  writer.write(word >> 8, word & 0xFF)

  word = m % p16
  writer.write(word >> 8, word & 0xFF)
}

function decodeNumber (reader) {
  let b = reader.read() | 0
  let sign = b >> 7 ? false : true // eslint-disable-line

  let s = sign ? -1 : 1

  let e = (b & 0x7F) << 4
  b = reader.read() | 0
  e += b >> 4
  if (sign) e = 0x7FF - e

  let tmp = [sign ? (0xF - (b & 0xF)) : b & 0xF]
  let i = 6

  while (i--) {
    tmp.push(sign ? (0xFF - (reader.read() | 0)) : reader.read() | 0)
  }

  let m = 0
  i = 7

  while (i--) {
    m = m / 256 + tmp[i]
  }

  m /= 16

  if (m === 0 && e === 0) {
    return 0
  }

  return (m + 1) * Math.pow(2, e - 1023) * s
}

const secondLayer = 0x3FFF + 0x7F

function encodeString (writer, string) {
  /* 3 layers:
   Chars 0         - 7E            are encoded as 0xxxxxxx with 1 added
   Chars 7F        - (3FFF+7F)     are encoded as 10xxxxxx xxxxxxxx with 7F subtracted
   Chars (3FFF+80) - FFFF          are encoded as 11xxxxxx xxxxxxxx xx000000
   */
  for (let i = 0; i < string.length; i++) {
    let code = string.charCodeAt(i)

    if (code <= 0x7E) {
      writer.write(code + 1)
    } else if (code <= secondLayer) {
      code -= 0x7F
      writer.write(0x80 | code >> 8, code & 0xFF)
    } else {
      writer.write(0xC0 | code >> 10, code >> 2 | 0xFF, (code | 3) << 6)
    }
  }

  writer.write(BYTE_TERMINATOR)
}

function decodeString (reader) {
  let buffer = []
  let layer = 0
  let unicode = 0
  let count = 0
  let $byte
  let tmp

  while (true) {
    $byte = reader.read()

    if ($byte === 0 || $byte == null) {
      break
    }

    if (layer === 0) {
      tmp = $byte >> 6
      if (tmp < 2) {
        buffer.push(String.fromCharCode($byte - 1))
      } else { // tmp equals 2 or 3
        layer = tmp
        unicode = $byte << 10
        count++
      }
    } else if (layer === 2) {
      buffer.push(String.fromCharCode(unicode + $byte + 0x7F))
      layer = unicode = count = 0
    } else { // layer === 3
      if (count === 2) {
        unicode += $byte << 2
        count++
      } else { // count === 3
        buffer.push(String.fromCharCode(unicode | $byte >> 6))
        layer = unicode = count = 0
      }
    }
  }

  return buffer.join('')
}

class HexStringReader {
  constructor (string) {
    this.string = string
    this.current = null
    this.lastIndex = string.length - 1
    this.index = -1
  }

  read () {
    if (this.index < this.lastIndex) {
      this.current = parseInt(this.string[++this.index] + this.string[++this.index], 16)
    } else {
      this.current = null
    }
    return this.current
  }
}

class HexStringWriter {
  constructor () {
    this.buffer = []
  }

  write (...bytes) {
    let c

    for (var i = 0; i < bytes.length; i++) {
      c = bytes[i].toString(16)
      this.buffer.push(c.length === 2 ? c : c = '0' + c)
    }
  }

  trim () {
    let length = this.buffer.length

    do {
      --length
    } while (this.buffer[length] === '00')

    this.buffer.length = ++length

    return this
  }

  toString () {
    if (this.buffer.length > 0) {
      return this.buffer.join('')
    } else {
      return null
    }
  }
}
