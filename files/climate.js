/*
  Usage:
  var cli = Climate("appid123123", "awesome.climate.build")
  cli.identity.showLogin()
*/

var Climate = (function () {
  function Identity (cli) {
    this.climate = cli;
    
  }

  Identity.prototype.showLogin = function() {
    
  }
  
  function Climate (appid, domain) {
    this.appid = appid
    this.domain = domain
    this.identity = Identity (this)
  }

  return Climate;
})();
