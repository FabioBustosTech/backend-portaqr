import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  buyOrder: string;

  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}
