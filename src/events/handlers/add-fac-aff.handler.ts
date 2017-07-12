import { FacilitatorAddedEvent } from '../events/facilitator-added.event';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : FacilitatorAddedEvent){

    let call = client.readUser({clause: `user.email='${event.email}'`});

    let users = [];

    call.on('data', user => users.push(user));

    call.on('end', () => {
        if(users.length !== 1) return console.error('Error finding users for facilitator email', event.email);

        let user = users[0];

        client.grantPermissionToUser({resource: `workshops -- ${event.affiliate}`, level: 2, accessorId: user.id}, (error, set) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-fac-aff.handle(): ', error);
            }

            client.grantPermissionToUser({resource: `affiliate -- ${event.affiliate}`, level: 1, accessorId: user.id}, (error, set) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in add-fac-aff.handle(): ', error);
                }
                console.log('PermissionSet: ', set);
            });
            console.log('PermissionSet: ', set);
        });
    });
}