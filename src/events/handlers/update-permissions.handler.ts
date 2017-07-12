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

    console.log('Add Facilitators', add);
    console.log('Remove Facilitators', remove);

    let addEmail = add.map(facilitator => { return `'${facilitator.Email}'`; });
    let removeEmail = remove.map(association => { return `'${association.Instructor__r.Email}'`; });

    let addCall;
    let removeCall;
    if(addEmail.length) addCall = client.readUser({clause: `user.email IN (${addEmail.join()})`});
    if(removeEmail.length) removeCall = client.readUser({clause: `user.email IN (${removeEmail.join()})`});

    let addUsers = [];
    let removeUsers = [];

    if(addEmail.length) addCall.on('data', user => addUsers.push(user));
    if(removeEmail.length) removeCall.on('data', user => removeUsers.push(user));

    if(addEmail.length) addCall.on('end', () => {
        for(let user of addUsers){
            client.grantPermissionToUser({resource: `/workshops/${event.id}`, level: 2, accessorId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in update-permissions.handle(): ', error);
                };
                return console.log('PermissionSet: ', user);
            });
        }
    });

    if(removeEmail.length) removeCall.on('end', () => {
        for(let user of removeUsers){
            client.revokePermissionFromUser({resource: `/workshops/${event.id}`, level: 2, accessorId: user.id}, (error, response) => {
                if(error) {
                    if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    return console.error('Error in update-permissions.handle(): ', error);
                };
                return console.log('Revoke Permissions -- PermissionSet: ', response);
            });
        }
    });

}