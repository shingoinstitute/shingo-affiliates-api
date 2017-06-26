export class WorkshopUpdatedEvent {
    public readonly id : string;
    public readonly newFacilitators : any[];
    public readonly oldFacilitators : any[];

    constructor(id : string, newFacilitators : any[], oldFacilitators : any[]){
        this.id = id;
        this.newFacilitators = newFacilitators;
        this.oldFacilitators = oldFacilitators;
    }
}