import { doc, read } from './doc'

const docs = doc('Object Stores', [{
  title: 'Authentication',
  description: read('./descriptions/authentication.markdown')
}, {
  title: "List an application's object stores",
  uris: [{
    method: 'GET',
    path: '/object-stores'
  }],
  response: {
    status: 200,
    body: read('./bodies/object-stores/list.json')
  }
}, {
  title: 'Create a new object store',
  uris: [{
    method: 'POST',
    path: '/object-stores'
  }],
  input: {
    params: {
      name: {
        type: 'string',
        description: 'A unique name',
        required: true
      },
      key_path: {
        type: 'string',
        description: 'The property that represents the key',
        required: true
      },
      auto_increment: {
        type: 'boolean',
        description: "Auto generate new id's for new records",
        default: false
      }
    },
    example: {
      name: 'folders',
      key_path: 'id'
    }
  },
  response: {
    status: 201,
    body: read('./bodies/object-stores/create.json')
  }
}])

console.log(docs.toString())
