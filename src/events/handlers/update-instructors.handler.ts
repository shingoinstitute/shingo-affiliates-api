import { WorkshopUpdatedEvent } from '../events/workshop-updated.event';
import { WorkshopEmitter } from '../emitters/workshop.emitter';
import * as _ from 'lodash';
import * as grpc from 'grpc';
import * as path from 'path';

const sfservices = grpc.load(path.join(__dirname, '../../../proto/sf_services.proto')).sfservices;
const client = new sfservices.SalesforceMicroservices('shingo-sf-api:80', grpc.credentials.createInsecure());

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

    for(let facilitator of add) {
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
            console.log('Association: ', result);
        });
    };

    for(let association of remove) {
        console.log('Removing association: ', association);
        const data = {
            object: 'WorkshopFacilitatorAssociation__c',
            ids: [association.Id]
        }
        client.delete(data, (error, result) => {
            if(error) {
                console.error('Raw ERROR: ', error);
                if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                return console.error('Error in add-instructors.handle(): ', error);
            };
            console.log('Association: ', result);
        });
    };
}