import {
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator'
import { IsSalesforceId } from '../../validators'
import { Workshop__c } from '../../sf-interfaces/Workshop__c.interface'
// tslint:disable:max-classes-per-file variable-name

// These classes are only used to validate for logic in the api
// making these classes validate that an object is correct for salesforce
// will be too difficult to keep in sync

export class CancelBody {
  @IsString()
  reason!: string
}

export class Facilitator {
  @IsSalesforceId()
  Id!: string
}

export class UpdateBody implements Partial<Workshop__c> {
  @IsSalesforceId()
  Id!: string

  @IsSalesforceId()
  Organizing_Affiliate__c!: string

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  facilitators?: Facilitator[]
}

export class CreateBody {
  @IsString()
  Name!: string

  @IsSalesforceId()
  Organizing_Affiliate__c!: string

  @IsDateString()
  Start_Date__c!: string

  @IsDateString()
  End_Date__c!: string

  @IsString()
  Host_Site__c!: string

  @IsString()
  Event_Country__c!: string

  @IsString()
  Event_City__c!: string

  @IsSalesforceId()
  Course_Manager__c!: string

  @IsArray()
  @ValidateNested({ each: true })
  facilitators!: Facilitator[]
}
