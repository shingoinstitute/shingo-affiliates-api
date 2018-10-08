import {
  IsString,
  IsDateString,
  IsArray,
  IsEmail,
  ValidateNested,
  IsNumber,
} from 'class-validator'
import { IsSalesforceId } from '../../validators'
import { Workshop__c } from '../../sf-interfaces/Workshop__c.interface'
// tslint:disable:max-classes-per-file variable-name

export class CancelBody {
  @IsString()
  reason!: string
}

// tslint:disable-next-line:class-name
export class facilitator {
  @IsSalesforceId()
  Id!: string

  @IsNumber()
  id!: number
}

export class UpdateBody implements Partial<Workshop__c> {
  @IsSalesforceId()
  Id!: string

  @IsSalesforceId()
  Organizing_Affiliate__c!: string

  @IsArray()
  @ValidateNested({ each: true })
  facilitators!: facilitator[]
}

export class Facilitator {
  @IsSalesforceId()
  Id!: string

  @IsEmail()
  Email!: string

  @IsNumber()
  id!: number
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
