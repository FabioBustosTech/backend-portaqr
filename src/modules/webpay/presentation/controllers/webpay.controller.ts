import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Res,
  ValidationPipe,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.usecase';
import { CommitTransactionUseCase } from '../../application/use-cases/commit-transaction.usecase';
import { RefundTransactionUseCase } from '../../application/use-cases/refund-transaction.usecase';
import { GetTransactionStatusUseCase } from '../../application/use-cases/get-transaction-status.usecase';
import { CreateTransactionDto } from '../../application/dto/create-transaction.dto';
import { RefundTransactionDto } from '../../application/dto/refund-transaction.dto';

@ApiTags('webpay')
@Controller('webpay')
export class WebpayController {
  private readonly basePathFront: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly errorUrl: string;

  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly commitTransactionUseCase: CommitTransactionUseCase,
    private readonly refundTransactionUseCase: RefundTransactionUseCase,
    private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
    private readonly configService: ConfigService,
    private readonly traceService: TraceService,
  ) {
    this.basePathFront =
      this.configService.get<string>('FRONTEND_BASE_PATH') || 'http://localhost:3000';
    this.successUrl =
      this.configService.get<string>('WEBPAY_SUCCESS_URL') ||
      `${this.basePathFront}/dashboard/qr/pay/webpay?status=success`;
    this.failUrl =
      this.configService.get<string>('WEBPAY_FAIL_URL') ||
      `${this.basePathFront}/dashboard/qr/pay/webpay?status=failed`;
    this.errorUrl =
      this.configService.get<string>('WEBPAY_ERROR_URL') ||
      `${this.basePathFront}/dashboard/qr/pay/webpay?status=error`;
  }

  @Post('create')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear transacciÃ³n' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'TransacciÃ³n creada exitosamente' })
  async createTransaction(
    @Body(new ValidationPipe()) createTransactionDto: CreateTransactionDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /webpay/create', {
      buyOrder: createTransactionDto.buyOrder,
    });
    return this.createTransactionUseCase.execute(createTransactionDto, tracking);
  }

  @Get('return')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'TransacciÃ³n confirmada' })
  async handleReturn(
    @Query('token_ws') token: string,
    @Res() res: Response,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/return', { token });

    try {
      const result = await this.commitTransactionUseCase.execute(token, tracking);
      this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/return - resultado', {
        status: result.status,
      });

      if (result.status === 'AUTHORIZED') {
        res.redirect(this.successUrl);
      } else {
        res.redirect(this.failUrl);
      }
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.CONTROLLER, 'GET /webpay/return - error', error as Error);
      res.redirect(this.errorUrl);
    }
  }

  @Post('refund')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reembolso registrado exitosamente' })
  async refundTransaction(
    @Body(new ValidationPipe()) refundTransactionDto: RefundTransactionDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /webpay/refund', {
      token: refundTransactionDto.token,
    });
    return this.refundTransactionUseCase.execute(refundTransactionDto, tracking);
  }

  @Get('status')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado de transacciÃ³n solicitado' })
  async getTransactionStatus(
    @Query('token') token: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/status', { token });
    return this.getTransactionStatusUseCase.execute(token, tracking);
  }

  @Get('transaction/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TransacciÃ³n solicitada' })
  async getTransaction(
    @Param('token') token: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/transaction/:token', { token });
    const tx = await this.getTransactionStatusUseCase.getFromDB
      ? await this.getTransactionStatusUseCase.getFromDB(token, tracking)
      : null;
    return tx;
  }
}
