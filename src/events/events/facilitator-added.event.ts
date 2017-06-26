export class FacilitatorAddedEvent {
    public readonly id : number;
    public readonly email : string;
    public readonly affiliate : string;

    constructor(id : number, email : string, affiliate : string){
        this.id = id;
        this.email = email;
        this.affiliate = affiliate;
    }
}