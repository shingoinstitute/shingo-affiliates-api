import * as events from 'events';
import { addFacAffPerm } from '../handlers';

export class FacilitatorEmitter {
    static emitter = new events.EventEmitter();
    static init() {
        FacilitatorEmitter.emitter.on('created', (data) => {
            addFacAffPerm(data);
        });
    }
}