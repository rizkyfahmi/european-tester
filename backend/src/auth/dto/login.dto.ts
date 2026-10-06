import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  username!: string;

  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}
