import { Controller, Post, Body, Get, Query, Res, ValidationPipe, Param, UseGuards, BadRequestException, HttpStatus, Request, HttpCode } from '@nestjs/common';
import { WebpayService } from './webpay.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/common/decorators/public.decorator';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';


@ApiTags('webpay')
@Controller('webpay')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WebpayController {
  private readonly basePathFront: string;
  private readonly successUrl: string;
  private readonly failUrl: string;
  private readonly errorUrl: string;
  private readonly logger = new CustomLogger(WebpayController.name);
  
  constructor(
    private readonly webpayService: WebpayService,
    private readonly configService: ConfigService,
  ) {
    this.basePathFront = this.configService.get<string>('FRONTEND_BASE_PATH') || 'http://localhost:3000';
    this.successUrl = this.configService.get<string>('WEBPAY_SUCCESS_URL') || `${this.basePathFront}/dashboard/qr/pay/webpay?status=success`;
    this.failUrl = this.configService.get<string>('WEBPAY_FAIL_URL') || `${this.basePathFront}/dashboard/qr/pay/webpay?status=failed`;
    this.errorUrl = this.configService.get<string>('WEBPAY_ERROR_URL') || `${this.basePathFront}/dashboard/qr/pay/webpay?status=error`;
  }

  @Post('create')
  @Public()
  @ApiOperation({ summary: 'Crear transacciÃ³n' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'TransacciÃ³n creada exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada invÃ¡lidos' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error interno del servidor' })
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(@Body(new ValidationPipe()) createTransactionDto: CreateTransactionDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(
        `Creando transacciÃ³n para orden ${createTransactionDto.buyOrder}`,
        WebpayController.name,
        'createTransaction',
        trackingId
      );
      const transaction = await this.webpayService.createTransaction(createTransactionDto, trackingId);
      this.logger.log(`TransacciÃ³n creada: ${transaction.buyOrder}`, WebpayController.name, 'createTransaction', trackingId);
      return transaction;
    } catch (error) {
      this.logger.error(`Error al crear transacciÃ³n: ${error.message}`,  error.stack, WebpayController.name, 'createTransaction', trackingId);
      throw new BadRequestException('Error al crear transacciÃ³n');
    }

  }

  @Get('return')
  @Public()
  @ApiResponse({ status: HttpStatus.OK, description: 'TransacciÃ³n confirmada' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Error al confirmar transacciÃ³n' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error al procesar respuesta de Webpay' })
  @HttpCode(HttpStatus.OK)
  async handleReturn(@Query('token_ws') token: string, @Res() res: Response, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Recibiendo respuesta de Webpay para token_ws ${token}`, WebpayController.name, 'handleReturn', trackingId);

      const result = await this.webpayService.commitTransaction(token, trackingId);
      this.logger.log(`TransacciÃ³n ${result.buyOrder} ${result.status}`, WebpayController.name, 'handleReturn', trackingId);

      if (result.status === 'AUTHORIZED') {
        this.logger.log(`Redirigiendo a ${this.successUrl}`, WebpayController.name, 'handleReturn', trackingId);
        res.redirect(this.successUrl);
      } else {
        this.logger.log(`Redirigiendo a ${this.failUrl}`, WebpayController.name, 'handleReturn', trackingId);
        res.redirect(this.failUrl);
      }
    } catch (error) {
      this.logger.error(`Error al procesar respuesta de Webpay para token_ws ${token}`,  error.stack, WebpayController.name, 'handleReturn', error);
      res.redirect(this.errorUrl);
    }
  }

  @Post('refund')
  @Public()
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Renbolso registrado exitosamente' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Datos de entrada invÃ¡lidos' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error al solicitar renbolso de transacciÃ³n' })
  @HttpCode(HttpStatus.CREATED)
  async refundTransaction(@Body(new ValidationPipe()) refundTransactionDto: RefundTransactionDto, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Solicitando renbolso de transacciÃ³n para token_ws }`, WebpayController.name, 'refundTransaction',trackingId);
      const refund = this.webpayService.refundTransaction(refundTransactionDto, trackingId);
      this.logger.log(`Renbolso de transacciÃ³n solicitado para token_ws`, WebpayController.name, 'refundTransaction',trackingId);
      return refund;
    } catch (error) {
      this.logger.error(`Error al procesar solicitud de renbolso de transacciÃ³n para token_ws`, error.stack, WebpayController.name, 'refundTransaction', trackingId);
      throw new BadRequestException('Error al solicitar el renbolso de la transacciÃ³n');
    }

  }

  @Get('status')
  @Public()
  @ApiResponse({ status: HttpStatus.OK, description: 'Estado de transacciÃ³n solicitado' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'TransacciÃ³n no encontrada' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error al obtener el estado de la transacciÃ³n' })
  @HttpCode(HttpStatus.OK)
  async getTransactionStatus(@Query('token') token: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Obteniendo estado de transacciÃ³n para token ${token}`, WebpayController.name, 'getTransactionStatus', trackingId);
      const status = await this.webpayService.getTransactionStatus(token, trackingId);
      this.logger.log(`Estado de transacciÃ³n obtenido: ${status}`, WebpayController.name, 'getTransactionStatus', trackingId);
      return status;

    } catch (error) {
      this.logger.error(`Error al obtener estado de transacciÃ³n para token ${token}`, error.stack, WebpayController.name, 'getTransactionStatus', trackingId);
      throw new BadRequestException('Error al obtener el estado de la transacciÃ³n');
    }

  }


  @Get('transaction/:token')
  @Public()
  @ApiResponse({ status: HttpStatus.OK, description: 'TransacciÃ³n solicitada' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'TransacciÃ³n no encontrada' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Error al obtener la transacciÃ³n' })
  @HttpCode(HttpStatus.OK)
  async getTransaction(@Param('token') token: string, @Request() req) {
    const trackingId = req['trackingId'];

    try {
      this.logger.log(`Obteniendo transacciÃ³n para token ${token}`, WebpayController.name, 'getTransaction', trackingId);
      const transaction = await this.webpayService.getTransactionFromDB(token, trackingId);
      this.logger.log(`TransacciÃ³n obtenida: ${transaction}`, WebpayController.name, 'getTransaction', trackingId);
      return transaction;
 
    } catch (error) {
      this.logger.error(`Error al obtener transacciÃ³n para token ${token}`, error.stack, WebpayController.name, 'getTransaction', trackingId);
      throw new BadRequestException('Error al obtener la transacciÃ³n');
    }
  }
}