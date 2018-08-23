import _ from 'lodash'
import { AuthClient } from '@shingo/shingo-auth-api'
import { loggerFactory } from './components'

const authService = new AuthClient(`${process.env.AUTH_API}:80`)
const log = loggerFactory()

/**
 * This class handles lifting the server.
 * It checks for required roles (creates them if not found) and stores the requried global ids
 * @export
 * @class InitService
 */
export class InitService {
  static async init() {
    log.info('Initializing Affiliate Portal...')

    const roles = (await authService.getRoles('role.service=\'affiliate-portal\''))

    const facilitator = roles.find(role => role.name === 'Facilitator')
    const affiliateManager = roles.find(role => role.name === 'Affiliate Manager')

    // FIXME: This is horrible - why is global being mutated?
    if (!facilitator) {
      const role = await authService.createRole({ name: 'Facilitator', service: 'affiliate-portal' })
      log.info('Created Facilitator role! %j', role)
      global['facilitatorId'] = role.id
    } else {
      log.info('Found Facilitator role: %j', _.omit(facilitator[0], ['users', 'permissions']))
      global['facilitatorId'] = facilitator.id
    }

    if (!affiliateManager) {
      const role = await authService.createRole({ name: 'Affiliate Manager', service: 'affiliate-portal' })
      log.info('Created Affiliate Manager role! %j', role)
      global['affiliateManagerId'] = role.id
    } else {
      log.info('Found Affiliate Manager role: %j', _.omit(affiliateManager[0], ['users', 'permissions']))
      global['affiliateManagerId'] = affiliateManager.id
    }
  }
}
