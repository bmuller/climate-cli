export const nullLogger = {
  debug: () => {},
  info: () => {},
  error: () => {}
}

export const verboseLogger = {
  debug: (...msg) => console.log('DEBUG:', ...msg),
  info: (...msg) => console.log('INFO: ', ...msg),
  error: (...msg) => console.error('ERROR:', ...msg)
}
