import { AuthService } from './components';
import * as _ from 'lodash';

const authService = new AuthService();

export class InitService {

    public static async  init() {
        console.log('Initializing Affiliate Portal...');

        const roles = (await authService.getRoles('role.service=\'affiliate-portal\'')).roles;

        const facilitator = roles.filter(role => { return role.name === 'Facilitator'; });
        const affiliateManager = roles.filter(role => { return role.name === 'Affiliate Manager'; });

        if (!facilitator.length) {
            const role = await authService.createRole({ name: 'Facilitator', service: 'affiliate-portal' });
            console.log('Created Facilitator role! ', role);
            global['facilitatorId'] = role.id;
        } else {
            console.log('Found Facilitator role: ', _.omit(facilitator[0], ['users', 'permissions']));
            global['facilitatorId'] = facilitator[0].id;
        }

        if (!affiliateManager.length) {
            const role = await authService.createRole({ name: 'Affiliate Manager', service: 'affiliate-portal' });
            console.log('Created Affiliate Manager role! ', role);
            global['affiliateManagerId'] = role.id;
        } else {
            console.log('Found Affiliate Manager role: ', _.omit(affiliateManager[0], ['users', 'permissions']));
            global['affiliateManagerId'] = affiliateManager[0].id;
        }

        return Promise.resolve();
    }
}