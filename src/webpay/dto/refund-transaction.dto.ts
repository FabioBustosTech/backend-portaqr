import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class RefundTransactionDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsNumber()
  @Min(1)
  amount: number;
}