import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator'
// tslint:disable:max-classes-per-file variable-name

export class LoginBody {
  @IsEmail()
  email!: string

  @IsString()
  password!: string

  @IsOptional()
  @IsString()
  services?: string
}

export class ChangePasswordBody {
  @IsString()
  password!: string
}

export class LoginAsBody {
  @IsNumber()
  adminId!: number

  @IsNumber()
  userId!: number
}
