import { Identity } from './identity'

export class Climate {
  constructor (appId, domain) {
    this.appId = appId
    this.domain = domain
    this.identity = new Identity(this)
  }

  staticClimateURL (fname) {
    return this.domain + '/static/' + fname
  }
}

window.Climate = function (appId, domain) {
  return new Climate(appId, domain)
}
