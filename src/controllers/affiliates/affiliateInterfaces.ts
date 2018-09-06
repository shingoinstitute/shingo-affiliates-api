import { IsString, IsEmail, ValidateNested, IsBase64, IsOptional, IsNumberString, IsNumber } from 'class-validator'
import { IsSalesforceId } from '../../validators'
// tslint:disable:max-classes-per-file variable-name

export class CreateBody {
  @IsString()
  Name!: string

  @IsOptional()
  @IsString()
  Summary__c?: string

  @IsOptional()
  @IsString()
  Website?: string

  @IsOptional()
  @IsString()
  Languages__c?: string

  @IsOptional()
  @IsString()
  Logo__c?: string

  @IsOptional()
  @IsString()
  Public_Contact__c?: string

  @IsOptional()
  @IsString()
  Public_Contact_Phone_c?: string

  @IsOptional()
  @IsEmail()
  Public_Contact_Email_c?: string

  @IsOptional()
  @IsString()
  Page_Path__c?: string
}

export class MapBody {
  @IsSalesforceId()
  Id!: string
}

export class UpdateBody {
  @IsSalesforceId()
  Id!: string

  @IsOptional()
  @IsString()
  Summary__c?: string

  @IsOptional()
  @IsString()
  Name?: string
}
