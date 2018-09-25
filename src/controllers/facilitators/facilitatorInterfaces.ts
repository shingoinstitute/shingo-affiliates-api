import {
  IsString,
  IsEmail,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator'
import { IsSalesforceId } from '../../validators'
// tslint:disable:max-classes-per-file variable-name

export class ChangePasswordBody {
  @IsString()
  password!: string

  @IsString()
  token!: string
}
export class Role {
  @IsNumber()
  id!: number

  @IsString()
  name!: string
}

export class CreateBody {
  @IsSalesforceId()
  AccountId!: string

  @IsString()
  FirstName!: string

  @IsString()
  LastName!: string

  @IsEmail()
  Email!: string

  @IsOptional()
  @IsNumber()
  roleId?: number

  @IsOptional()
  @ValidateNested()
  role?: Role
}

export class MapBody {
  @IsSalesforceId()
  AccountId!: string

  @IsEmail()
  Email!: string

  @IsString()
  @IsOptional()
  password?: string

  @IsOptional()
  @ValidateNested()
  role?: Role
}

export class UpdateBody {
  @IsSalesforceId()
  Id!: string

  @IsOptional()
  @IsString()
  FirstName?: string

  @IsOptional()
  @IsString()
  LastName?: string

  @IsOptional()
  @IsEmail()
  Email?: string

  @IsOptional()
  @IsString()
  password?: string

  @IsOptional()
  @IsString()
  Biography__c?: string
}
