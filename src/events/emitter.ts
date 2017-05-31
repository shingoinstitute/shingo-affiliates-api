import * as events from 'events';

export class Events {
    public static emitter;

    constructor(){
        if(Events.emitter === undefined){
            Events.emitter = new events.EventEmitter();
        }
    }
}