import { routes as storageRoutes } from './storage'
import { routes as identityRoutes } from './identity'

export function routes (app, storage, config) {
  storageRoutes(app, storage, config)
  identityRoutes(app, storage, config)
}
