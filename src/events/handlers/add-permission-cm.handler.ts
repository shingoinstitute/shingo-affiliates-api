import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){

    let call = client.readRole({clause: `role.name='Course Manager -- ${event.affiliate}'`});

    let roles = [];

    call.on('data', role => roles.push(role));

    call.on('end', () => {
        if(roles.length !== 1) return console.error('Error finding role for course manager', event);

        let role = roles[0];

        client.grantPermission({resource: `/workshops/${event.id}`, level: 2, accessorId: role.id}, (error, set) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-permission-cm.handle(): ', error);
            };
            return console.log('PermissionSet: ', set);
        });
    });
}