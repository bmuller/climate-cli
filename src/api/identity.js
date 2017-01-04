import fs from 'fs'
import path from 'path'

export function routes (app, storage, config) {
  const idconfpath = path.join(config.configDir, 'identity.js')
  var idconf = {
    authentication: {
      password: true
    }
  }

  if (fs.existsSync(idconfpath)) {
    idconf = JSON.parse(fs.readFileSync(idconfpath))
  }

  app.route('/identity/methods')
    .get((req, res) => {
      var oauth = Object.keys(idconf.authentication.oauth || {})
      res.json({ password: idconf.authentication.password, oauth: oauth })
    })
}
