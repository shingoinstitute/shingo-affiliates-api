import { IEvent } from '@nestjs/cqrs';

export class WorkshopAddedEvent implements IEvent {
    constructor(public readonly workshopId : string,
                public readonly affiliateId : string){}
}