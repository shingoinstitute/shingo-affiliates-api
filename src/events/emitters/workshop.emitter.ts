import * as events from 'events';
import {afHandleWorkshopAdd, cmHandleWorkshopAdd, facHandleWorkshopAdd,
        removePermHandleWorkshopDel, instructorsHandleWorkshopAdd, instructorsHandleWorkshopUpdate,
        updatePermHandleWorkshopUpdate} from '../handlers';

export class WorkshopEmitter {
    static emitter = new events.EventEmitter();
    static init() {
        WorkshopEmitter.emitter.on('created', (data) => {
            afHandleWorkshopAdd(data);
            cmHandleWorkshopAdd(data);
            facHandleWorkshopAdd(data);
            instructorsHandleWorkshopAdd(data);
        });

        WorkshopEmitter.emitter.on('updated', (data) => {
            instructorsHandleWorkshopUpdate(data);
            updatePermHandleWorkshopUpdate(data);
        });

        WorkshopEmitter.emitter.on('deleted', (data) => {
            removePermHandleWorkshopDel(data);
        });
    }
}