import path from 'path'
import fs from 'fs'
import bel from 'bel'
import { markdown } from 'markdown'

function toHTML (text) {
  if (text) {
    const html = markdown.toHTML(text)
    const element = bel.createElement('div', {}, [])
    element.innerHTML = html
    return element
  }
}

export function doc (title, description, blocks) {
  if (blocks === undefined && description) {
    blocks = description
    description = undefined
  }

  const element = bel`
    <main>
      <h1>${title}</h1>
      ${toHTML(description)}
      ${blocks.map(block)}
    </main>
  `
  return element.toString()
}

export function read (relativePath) {
  const fullPath = path.join(__dirname, relativePath)
  const contents = fs.readFileSync(fullPath, { encoding: 'utf8' })
  return contents
}

function block (info) {
  return bel`
    <section>
      <h2>${info.title}</h2>
      ${toHTML(info.description)}
      ${formatUris(info.uris)}
      ${formatParams(info.params)}
      ${formatInput(info.input)}
      ${formatNote(info.note)}
      ${formatResponse(info.response)}
    </section>
  `
}

function formatUris (uris) {
  if (!uris) { return }

  return uris.map(uri => bel`
    <p><pre>${uri.method} ${uri.path}</pre></p>
  `)
}

function formatParams (params) {
  if (params) {
    return bel`
      <div>
        <h3>Parameters</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          ${formatParamBody(params)}
        </table>
      </div>
    `
  }
}

function formatParamBody (params) {
  const paramsKeys = Object.keys(params).sort()
  return bel`
    <tbody>
      ${paramsKeys.map(key => {
        const value = params[key]
        value.name = key
        return formatParamRow(value)
      })}
    </tbody>
  `
}

function formatParamRow (param) {
  return bel`
    <tr>
      <td>${param.name}</td>
      <td>${param.type}</td>
      <td>${param.description}</td>
    </tr>
  `
}

function formatInput (input) {
}

function formatNote (note) {
  if (note) {
    if (note.indexOf('\n') === -1) {
      return toHTML(`_Note:_ ${note}`)
    } else {
      return toHTML(`_Note:_\n\n${note}`)
    }
  }
}

function formatResponse (response) {
  if (response) {
    return bel`
      <div>
        <h3>Response</h3>
        ${formatHeaders(response.status, response.headers)}
        ${formatBody(response.body)}
      </div>
    `
  }
}

function formatHeaders (status, headers) {
  if (headers) {
    const headerKeys = Object.keys(headers).sort()
    headerKeys.unshift('status')
    headers['Status'] = `${status} ${statusLookup(status)}`

    return bel`
      <p><pre>${headerKeys.map(key => {
        const value = headers[key]
        return `${key}: ${value}\n`
      })}</pre></p>
    `
  }
}

function statusLookup (status) {
  switch (status) {
    case 200:
      return 'OK'
    case 201:
      return 'Created'
    case 404:
      return 'Not found'
  }
}

function formatBody (body) {
  if (body) {
    return bel`
      <p><pre>${body}</pre></p>
    `
  }
}
