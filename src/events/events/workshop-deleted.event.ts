export class WorkshopDeletedEvent {
    public readonly id : string;

    constructor(id : string){
        this.id = id;
    }
}