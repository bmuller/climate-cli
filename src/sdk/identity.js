export class Identity {
  constructor (climate) {
    this.climate = climate
  }

  showLogin () {
    const css = 'div#climate-auth-modal {margin: 0px; padding: 0px; left: 0;' +
          'bottom: 0; right: 0; position: fixed; height: 100%; overflow: auto;' +
          'width: 100%; opacity: 0.9; z-index: 1000000; background-color: #ccc;' +
          'background: radial-gradient(#40404b, #111118) rgba(34,34,40,0.94);} ' +
          'div#climate-auth-window { width: 300px; height: 300px; opacity: 1.0; margin-top: 10%;' +
          'border: 1px solid #ff0000; background: #fff; display: block; margin: auto; }'
    var head = document.head || document.getElementsByTagName('head')[0]
    var style = document.createElement('style')
    var modal = document.createElement('div')
    var iframe = this.climate.staticClimateURL('login-form.html')

    style.type = 'text/css'
    if (style.styleSheet) {
      style.styleSheet.cssText = css
    } else {
      style.appendChild(document.createTextNode(css))
    }

    head.appendChild(style)
    modal.setAttribute('id', 'climate-auth-modal')
    modal.innerHTML = '<div id="climate-auth-window"><iframe src="' + iframe + '"></iframe></div>'
    document.getElementsByTagName('body')[0].appendChild(modal)
  }
}
