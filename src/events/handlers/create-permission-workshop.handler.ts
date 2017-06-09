import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){
    console.log('event: ', event);
    const levels = [0,1,2];
    levels.map(level => {
        client.createPermission({resource: `/workshops/${event.id}`, level }, (error, permission) => {
            if(error) {
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-permission-cm.handle(): ', error);
            }

            return console.log('create-permission-workshop.handle() created Permission: ', permission);
        });
    });
}