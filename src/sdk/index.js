import { Identity } from './identity'

class Climate {
  constructor (appId, domain) {
    this.appId = appId
    this.domain = domain
    this.identity = new Identity(this)
  }
}
