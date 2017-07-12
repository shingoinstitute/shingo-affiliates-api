import * as grpc from 'grpc';
import * as path from 'path';
import * as _ from 'lodash';

const authservices = grpc.load(path.join(__dirname, '../proto/auth_services.proto')).authservices;
const authClient = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export class InitService {

    public static init() {
        console.log('Initializing Affiliate Portal...');
        let call = authClient.readRole({clause: 'role.service=\'affiliate-portal\''});
        let roles = new Array<any>();

        call.on('data', role => roles.push(role) );

        call.on('status', status => console.log('Status: ', status));

        call.on('end', () => {
            let facilitator = roles.filter(role => { return role.name === 'Facilitator'; });
            let affiliateManager = roles.filter(role => { return role.name === 'Affiliate Manager'; });

            if(!facilitator.length) {
                authClient.createRole({name: 'Facilitator', service: 'affiliate-portal'}, (error, role) => {
                    if(error) throw Error(error);
                    console.log('Created Facilitator role...', role);
                    global['facilitatorId'] = role.id;
                });
            } else {
                console.log('Found Facilitator role: ', _.omit(facilitator[0],['users', 'permissions']));
            }
            
            if(!affiliateManager.length) {
                authClient.createRole({name: 'Affiliate Manager', service: 'affiliate-portal'}, (error, role) => {
                    if(error) throw Error(error);
                    console.log('Created Affiliate Manager role! ', role);
                    global['affiliateManagerId'] = role.id;
                });
            } else {
                console.log('Found Affiliate Manager role: ', _.omit(affiliateManager[0], ['users', 'permissions']));
            }
        });
    }
}