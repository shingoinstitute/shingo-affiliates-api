import { FacilitatorAddedEvent } from '../events/facilitator-added.event';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : FacilitatorAddedEvent){
    client.getUserByEmail({value: event.email}, (error, user) => {
        if(error) {
            if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
            return console.error('Error in add-fac-aff.handle(): ', error);
        };

        client.grantPermission({resource: `workshops -- ${event.affiliate}`, level: 2, userId: user.id}, (error, response) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-fac-aff.handle(): ', error);
            };
            client.grantPermission({resource: `affiliate -- ${event.affiliate}`, level: 1, userId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in add-fac-aff.handle(): ', error);
                };
                console.log('PermissionSet: ', response);
            });
            console.log('PermissionSet: ', response);
        });

    });
}