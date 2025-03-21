import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateGatewayDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsString()
  apiKey: string;
}
