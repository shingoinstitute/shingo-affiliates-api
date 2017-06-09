import * as events from 'events';
import {afHandleWorkshopAdd, cmHandleWorkshopAdd, facHandleWorkshopAdd, createPermHandleWorkshopAdd,
        removePermHandleWorkshopDel} from '../handlers';

export class WorkshopEmitter {
    static emitter = new events.EventEmitter();
    static init() {
        WorkshopEmitter.emitter.on('created', (data) => {
            createPermHandleWorkshopAdd(data);
            afHandleWorkshopAdd(data);
            cmHandleWorkshopAdd(data);
            facHandleWorkshopAdd(data);
        });

        WorkshopEmitter.emitter.on('deleted', (data) => {
            removePermHandleWorkshopDel(data);
        })
    }
}