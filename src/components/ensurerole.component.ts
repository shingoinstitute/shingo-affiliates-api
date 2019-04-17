import _ from 'lodash'
import { Injectable } from '@nestjs/common'
import { AuthService } from './auth/auth.component'

const data: {
  facilitatorId?: number
  affiliateId?: number
} = {}

/**
 * This class ensures affiliate portal roles exist, and provide access to the role ids
 */
@Injectable()
export class EnsureRoleService {
  get facilitatorId() {
    if (data.facilitatorId == null) {
      throw new Error(
        'EnsureRoleService was improperly initialized, facilitatorId was undefined'
      )
    }
    return data.facilitatorId
  }

  get affiliateId() {
    if (data.affiliateId == null) {
      throw new Error(
        'EnsureRoleService was improperly initialized, affiliateId was undefined'
      )
    }
    return data.affiliateId
  }

  constructor(private authService: AuthService = new AuthService()) {}

  async init() {
    if (data.facilitatorId != null && data.affiliateId != null) {
      return
    }

    console.info('Ensuring Affiliate Portal Roles exist')
    const { roles } = await this.authService.getRoles(
      "role.service='affiliate-portal'"
    )

    const facilitator = roles.find(
      (role: { name: string }) => role.name === 'Facilitator'
    )
    const affiliateManager = roles.find(
      (role: { name: string }) => role.name === 'Affiliate Manager'
    )

    if (!facilitator) {
      const role = await this.authService.createRole({
        name: 'Facilitator',
        service: 'affiliate-portal',
      })
      console.info('Created Facilitator role! %j', role)
      data.facilitatorId = role.id
    } else {
      console.info(
        'Found Facilitator role: %j',
        _.omit(facilitator, ['users', 'permissions'])
      )
      data.facilitatorId = facilitator.id
    }

    if (!affiliateManager) {
      const role = await this.authService.createRole({
        name: 'Affiliate Manager',
        service: 'affiliate-portal',
      })
      console.info('Created Affiliate Manager role! %j', role)
      data.affiliateId = role.id
    } else {
      console.info(
        'Found Affiliate Manager role: %j',
        _.omit(affiliateManager, ['users', 'permissions'])
      )
      data.affiliateId = affiliateManager.id
    }
  }
}
