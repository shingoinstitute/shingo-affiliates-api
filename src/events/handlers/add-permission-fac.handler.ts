import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){
    if(!event.facilitators) return console.log('No faciliattors for event!');
    event.facilitators.map(facilitator => {
        client.getUserByEmail({value: facilitator.Email}, (error, user) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-permission-fac.handle(): ', error);
            };

            if(!user) return console.error(`User not found for \'${facilitator.email}}\'`);
            client.grantPermission({resource: `/workshops/${event.id}`, level: 2, userId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in add-permission-fac.handle(): ', error);
                };
                return console.log('PermissionSet: ', user);
            });
        });
    });    
}