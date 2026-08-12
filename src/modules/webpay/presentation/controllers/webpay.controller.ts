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
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../../../common/decorators/public.decorator';
import { GetUser } from '../../../../common/decorators/user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { assertOwnerOrAdmin } from '../../../../common/utils/ownership.utils';
import { CreateTransactionUseCase } from '../../application/use-cases/create-transaction.usecase';
import { CommitTransactionUseCase } from '../../application/use-cases/commit-transaction.usecase';
import { RefundTransactionUseCase } from '../../application/use-cases/refund-transaction.usecase';
import { GetTransactionStatusUseCase } from '../../application/use-cases/get-transaction-status.usecase';
import { CreateTransactionDto } from '../../application/dto/create-transaction.dto';
import { RefundTransactionDto } from '../../application/dto/refund-transaction.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@ApiTags('webpay')
@Controller('webpay')
@UseGuards(RolesGuard)
@ApiBearerAuth()
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear transacción' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Transacción creada exitosamente' })
  async createTransaction(
    @Body(new ValidationPipe()) createTransactionDto: CreateTransactionDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /webpay/create', {
      buyOrder: createTransactionDto.buyOrder,
    });

    // SPEC-009 A2: sessionId SIEMPRE del token JWT — nunca del body
    return this.createTransactionUseCase.execute(createTransactionDto, user.id, tracking);
  }

  @Get('return')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, description: 'Transacción confirmada' })
  async handleReturn(
    @Query('token_ws') token: string,
    @Res() res: Response,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/return', {
      tokenPreview: token ? token.slice(0, 8) + '…' : '',
    });

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
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reembolso registrado exitosamente' })
  async refundTransaction(
    @Body(new ValidationPipe()) refundTransactionDto: RefundTransactionDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /webpay/refund', {
      tokenPreview: refundTransactionDto.token ? refundTransactionDto.token.slice(0, 8) + '…' : '',
    });
    return this.refundTransactionUseCase.execute(refundTransactionDto, tracking);
  }

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado de transacción solicitado' })
  async getTransactionStatus(
    @Query('token') token: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/status', {
      tokenPreview: token ? token.slice(0, 8) + '…' : '',
    });

    // SPEC-009 A2: ownership — la tx consultada debe ser del autenticado (o admin)
    const tx = await this.getTransactionStatusUseCase.execute(token, tracking);
    if (!tx || !tx.sessionId) {
      throw new NotFoundException('Transacción no encontrada');
    }
    assertOwnerOrAdmin(tx.sessionId, user, 'No tiene permiso para consultar esta transacción.');
    return tx;
  }

  @Get('transaction/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transacción solicitada' })
  async getTransaction(
    @Param('token') token: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /webpay/transaction/:token', {
      tokenPreview: token ? token.slice(0, 8) + '…' : '',
    });

    // SPEC-009 A2: ownership (idem)
    const tx = await this.getTransactionStatusUseCase.getFromDB(token, tracking);
    if (!tx || !tx.sessionId) {
      throw new NotFoundException('Transacción no encontrada');
    }
    assertOwnerOrAdmin(tx.sessionId, user, 'No tiene permiso para consultar esta transacción.');
    return tx;
  }
}
