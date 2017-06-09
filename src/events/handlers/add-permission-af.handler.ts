import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){
    client.getRole({value: 'Affiliate Manager'}, (error, role) => {
        if(error) {
            if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
            return console.error('Error in add-permission-af.handle(): ', error);
        };

        client.grantPermission({resource: `/workshops/${event.id}`, level: 2, roleId: role.id}, (error, response) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-permission-af.handle(): ', error);
            };
            return console.log('PermissionSet: ', response);
        });
    });
}