import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty({ example: '64f0e123456789abcdef0123' })
  _id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;
}

export class QrCodeResponse {
  @ApiProperty({ example: '64f0e123456789abcdef0123' })
  _id: string;

  @ApiProperty({ example: 'QR123' })
  name: string;

  @ApiProperty({ example: 'QR123' })
  code: string;
}

export class PlanResponse {
  @ApiProperty({ example: '64f0e123456789abcdef0123' })
  _id: string;

  @ApiProperty({ example: 'Basic Plan' })
  name: string;

  @ApiProperty({ example: 'Basic plan description' })
  description: string;
}

export class QrElementResponse {
  @ApiProperty({ type: QrCodeResponse })
  qrCode: QrCodeResponse;

  @ApiProperty({ type: PlanResponse })
  plan: PlanResponse;
}

export class QrActivateResponse {
  @ApiProperty({ example: '64f0e123456789abcdef0123' })
  _id: string;

  @ApiProperty({ enum: ['WEBPAY', 'TRANSFER', 'ADMIN'] })
  methodActivation: string;

  @ApiProperty()
  state: string;

  @ApiProperty({ type: UserResponse })
  userId: UserResponse;

  @ApiProperty({ type: [QrElementResponse] })
  qrList: QrElementResponse[];

  @ApiProperty({ type: UserResponse, required: false })
  adminId: UserResponse;
}

export class PaginatedQrActivateResponse {
  @ApiProperty({ type: [QrActivateResponse] })
  data: QrActivateResponse[];

  @ApiProperty()
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
