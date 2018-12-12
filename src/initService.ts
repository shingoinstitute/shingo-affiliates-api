import { AuthService } from './components';
import * as _ from 'lodash';

const authService = new AuthService();

/**
 * This class handles lifting the server. It checks for required roles (creates them if not found) and stores the requried global ids
 * 
 * @export
 * @class InitService
 */
export class InitService {

    public static async init() {
        console.info('Initializing Affiliate Portal...');

        const roles = (await authService.getRoles('role.service=\'affiliate-portal\'')).roles;

        const facilitator = roles.filter(role => { return role.name === 'Facilitator'; });
        const affiliateManager = roles.filter(role => { return role.name === 'Affiliate Manager'; });

        if (!facilitator.length) {
            const role = await authService.createRole({ name: 'Facilitator', service: 'affiliate-portal' });
            console.info('Created Facilitator role! %j', role);
            global['facilitatorId'] = role.id;
        } else {
            console.info('Found Facilitator role: %j', _.omit(facilitator[0], ['users', 'permissions']));
            global['facilitatorId'] = facilitator[0].id;
        }

        if (!affiliateManager.length) {
            const role = await authService.createRole({ name: 'Affiliate Manager', service: 'affiliate-portal' });
            console.info('Created Affiliate Manager role! %j', role);
            global['affiliateManagerId'] = role.id;
        } else {
            console.info('Found Affiliate Manager role: %j', _.omit(affiliateManager[0], ['users', 'permissions']));
            global['affiliateManagerId'] = affiliateManager[0].id;
        }

        return ;
    }
}