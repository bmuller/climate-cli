/*
  Usage:
  var cli = Climate("appid123123", "awesome.climate.build")
  cli.identity.showLogin()
*/

export class Climate {
  constructor (appId, domain) {
    this.appId = appId
    this.domain = domain
    this.identity = new Identity(this)
  }
}

class Identity {
  constructor (climate) {
    this.climate = climate
  }

  showLogin () {}
}
