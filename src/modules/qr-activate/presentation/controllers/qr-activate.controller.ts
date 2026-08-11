import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateQrActivateUseCase } from '../../application/use-cases/create-qr-activate.usecase';
import { GetAllQrActivateUseCase } from '../../application/use-cases/get-all-qr-activate.usecase';
import { GetQrActivateUseCase } from '../../application/use-cases/get-qr-activate.usecase';
import { UpdateQrActivateUseCase } from '../../application/use-cases/update-qr-activate.usecase';
import { UpdateWebpayQrActivateUseCase } from '../../application/use-cases/update-webpay-qr-activate.usecase';
import { DeleteQrActivateUseCase } from '../../application/use-cases/delete-qr-activate.usecase';
import { CreateQrActivateDto } from '../../application/dto/create-qr-activate.dto';
import { UpdateQrActivateDto } from '../../application/dto/update-qr-activate.dto';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';

@ApiTags('QR Activate')
@Controller('qr-activate')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class QrActivateController {
  constructor(
    private readonly createQrActivateUseCase: CreateQrActivateUseCase,
    private readonly getAllQrActivateUseCase: GetAllQrActivateUseCase,
    private readonly getQrActivateUseCase: GetQrActivateUseCase,
    private readonly updateQrActivateUseCase: UpdateQrActivateUseCase,
    private readonly updateWebpayQrActivateUseCase: UpdateWebpayQrActivateUseCase,
    private readonly deleteQrActivateUseCase: DeleteQrActivateUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post()
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva activaciÃ³n de QR' })
  async create(
    @Body() createQrActivateDto: CreateQrActivateDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr-activate', {
      methodActivation: createQrActivateDto.methodActivation,
    });
    return this.createQrActivateUseCase.execute(createQrActivateDto, tracking);
  }

  @Get()
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener todas las activaciones' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Tracking() tracking: TrackingContext,
    @Query('methodActivation') methodActivation?: string,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-activate', {
      page,
      limit,
    });
    return this.getAllQrActivateUseCase.execute(page, limit, search, methodActivation, tracking);
  }

  @Get(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una activaciÃ³n por ID' })
  async findOne(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-activate/:id', { id });
    return this.getQrActivateUseCase.execute(id, tracking);
  }

  @Patch('webpay/:token_ws')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de activaciÃ³n por token de Webpay' })
  async updateWebpay(
    @Param('token_ws') token_ws: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr-activate/webpay/:token_ws', {
      token_ws,
    });
    return this.updateWebpayQrActivateUseCase.execute(token_ws, tracking);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar activaciÃ³n' })
  async update(
    @Param('id') id: string,
    @Body() updateQrActivateDto: UpdateQrActivateDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr-activate/:id', { id });
    return this.updateQrActivateUseCase.execute(id, updateQrActivateDto, tracking);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar activaciÃ³n' })
  async remove(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /qr-activate/:id', { id });
    await this.deleteQrActivateUseCase.execute(id, tracking);
    return { message: 'ActivaciÃ³n eliminada exitosamente' };
  }
}
