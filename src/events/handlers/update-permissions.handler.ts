import { WorkshopUpdatedEvent } from '../events/workshop-updated.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as _ from 'lodash';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopUpdatedEvent){
    let remove = _.differenceWith(event.oldFacilitators, event.newFacilitators, (val, other) => {
        console.log('val:', val);
        console.log('other:', other);
        return other && val.Instructor__c === other.Id;
    });
    let add = _.differenceWith(event.newFacilitators, event.oldFacilitators, (val, other) => {
        console.log('val:', val);
        console.log('other:', other);
        return other && val.Id === other.Instructor__c;
    });

    add.map(facilitator => {
        client.getUserByEmail({value: facilitator.Email}, (error, user) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in update-permissions.handle(): ', error);
            };

            if(!user) return console.error(`User not found for \'${facilitator.email}}\'`);
            client.grantPermission({resource: `/workshops/${event.id}`, level: 2, userId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in update-permissions.handle(): ', error);
                };
                return console.log('PermissionSet: ', user);
            });
        });
    });

    remove.map(association => {
        client.getUserByEmail({value: association.Instructor__r.Email}, (error, user) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in update-permissions.handle(): ', error);
            };

            if(!user) return console.error(`User not found for \'${association.Instructor__r.Email}}\'`);
            client.revokePermission({resource: `/workshops/${event.id}`, level: 2, userId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in update-permissions.handle(): ', error);
                };
                return console.log('Revoke Permissions -- PermissionSet: ', user);
            });
        });
    });
}