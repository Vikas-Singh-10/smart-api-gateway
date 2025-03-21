import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateGatewayDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;
}
