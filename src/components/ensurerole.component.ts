import _ from 'lodash'
import { AuthClient } from '@shingo/auth-api-client'
import { defaultPort } from '../util'
import { Injectable } from '@nestjs/common'

/**
 * This class ensures affiliate portal roles exist, and provide access to the role ids
 */
@Injectable()
export class EnsureRoleService {
  private _facilitatorId?: number
  private _affiliateId?: number

  get facilitatorId() {
    if (typeof this._facilitatorId === 'undefined')
      throw new Error(
        'EnsureRoleService was improperly initialized, facilitatorId was undefined',
      )
    return this._facilitatorId
  }

  get affiliateId() {
    if (typeof this._affiliateId === 'undefined')
      throw new Error(
        'EnsureRoleService was improperly initialized, affiliateId was undefined',
      )
    return this._affiliateId
  }

  constructor(
    private authService: AuthClient = new AuthClient(
      defaultPort(process.env.AUTH_API!, 80),
    ),
  ) {}

  async init() {
    if (
      typeof this._facilitatorId !== 'undefined' &&
      typeof this._affiliateId !== 'undefined'
    )
      return

    console.info('Ensuring Affiliate Portal Roles exist')
    const roles = await this.authService.getRoles(
      "role.service='affiliate-portal'",
    )

    const facilitator = roles.find(role => role.name === 'Facilitator')
    const affiliateManager = roles.find(
      role => role.name === 'Affiliate Manager',
    )

    if (!facilitator) {
      const role = await this.authService.createRole({
        name: 'Facilitator',
        service: 'affiliate-portal',
      })
      console.info('Created Facilitator role! %j', role)
      this._facilitatorId = role.id
    } else {
      console.info(
        'Found Facilitator role: %j',
        _.omit(facilitator, ['users', 'permissions']),
      )
      this._facilitatorId = facilitator.id
    }

    if (!affiliateManager) {
      const role = await this.authService.createRole({
        name: 'Affiliate Manager',
        service: 'affiliate-portal',
      })
      console.info('Created Affiliate Manager role! %j', role)
      this._affiliateId = role.id
    } else {
      console.info(
        'Found Affiliate Manager role: %j',
        _.omit(affiliateManager, ['users', 'permissions']),
      )
      this._affiliateId = affiliateManager.id
    }
  }
}