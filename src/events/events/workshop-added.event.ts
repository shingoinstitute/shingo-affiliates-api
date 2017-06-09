export class WorkshopAddedEvent {
    public readonly id : string;
    public readonly affiliate : string;
    public readonly facilitators : any[];

    constructor(id : string, affiliate : string, facilitators : any[]){
        this.id = id;
        this.affiliate = affiliate;
        this.facilitators = facilitators;
    }
}