import { WorkshopAddedEvent } from '../events/workshop-added.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as grpc from 'grpc';
import * as path from 'path';

const sfservices = grpc.load(path.join(__dirname, '../../../proto/sf_services.proto')).sfservices;
const client = new sfservices.SalesforceMicroservices('shingo-sf-api:80', grpc.credentials.createInsecure());

export function handle(event : WorkshopAddedEvent){
    if(!event.facilitators) return console.log('No facilitators for event!');
    event.facilitators.map(facilitator => {
        console.log('Adding association: ',facilitator);
        const data = {
            object: 'WorkshopFacilitatorAssociation__c',
            records: [ {contents: JSON.stringify({Workshop__c: event.id, Instructor__c: facilitator.Id})}]
        }
        client.create(data, (error, result) => {
            if(error) {
                console.error('Raw ERROR: ', error);
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-instructors.handle(): ', error);
            };
            console.log('PermissionSet: ', result);
        });
    });
}