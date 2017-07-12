import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){
    if(!event.facilitators) return console.log('No faciliattors for event!');

    let emails = event.facilitators.map(facilitator => { return `'${facilitator.Email}'`; });

    let call = client.readUser({clause: `user.email IN (${emails.join()})`});

    let users = [];

    call.on('data', user => users.push(user));

    call.on('end', () => {
        if(users.length === 0) return console.error('No users found for event', event);
        users.forEach(user => {
            client.grantPermissionToUser({resource: `/workshops/${event.id}`, level: 2, accessorId: user.id}, (error, set) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in add-permission-fac.handle(): ', error);
                };
                return console.log('PermissionSet: ', set);
            });
        });
    }); 
}