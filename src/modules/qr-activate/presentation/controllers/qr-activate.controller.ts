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
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
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
import { GetUser } from '../../../../common/decorators/user.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { assertOwnerOrAdmin } from '../../../../common/utils/ownership.utils';

interface AuthenticatedUser {
  id: string;
  role: string;
}

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
  @ApiOperation({ summary: 'Crear nueva activación de QR' })
  async create(
    @Body() createQrActivateDto: CreateQrActivateDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /qr-activate', {
      methodActivation: createQrActivateDto.methodActivation,
    });
    // SPEC-007 H2: la activación admin activa los QRs en batch (executeAdmin con activateMany).
    // SPEC-009 A3: el actor (del token) se pasa al usecase — userId y state según rol.
    if (createQrActivateDto.methodActivation === 'ADMIN') {
      return this.createQrActivateUseCase.executeAdmin(createQrActivateDto, user, tracking);
    }
    return this.createQrActivateUseCase.execute(createQrActivateDto, user, tracking);
  }

  @Get()
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener todas las activaciones' })
  async findAll(
    @GetUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('methodActivation') methodActivation: string | undefined = undefined,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-activate', {
      page,
      limit,
    });

    // SPEC-009 A3: un usuario solo ve SUS activaciones; el admin las ve todas
    const userIdFilter = user.role === 'admin' ? undefined : user.id;
    return this.getAllQrActivateUseCase.execute(
      page,
      limit,
      search,
      methodActivation,
      userIdFilter,
      tracking,
    );
  }

  @Get(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una activación por ID' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /qr-activate/:id', { id });

    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID de activación inválido.');
    }
    const activation = await this.getQrActivateUseCase.execute(id, tracking);
    // SPEC-009 A3: patrón estándar — dueño o admin
    assertOwnerOrAdmin(activation.userId, user, 'No tiene permiso para ver esta activación.');
    return activation;
  }

  @Patch('webpay/:token_ws')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de activación por token de Webpay' })
  async updateWebpay(
    @Param('token_ws') token_ws: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr-activate/webpay/:token_ws', {
      tokenPreview: token_ws ? token_ws.slice(0, 8) + '…' : '',
    });
    return this.updateWebpayQrActivateUseCase.execute(token_ws, tracking);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar activación' })
  async update(
    @Param('id') id: string,
    @Body() updateQrActivateDto: UpdateQrActivateDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /qr-activate/:id', { id });

    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID de activación inválido.');
    }
    const activation = await this.getQrActivateUseCase.execute(id, tracking);
    // SPEC-009 A3: patrón estándar — dueño o admin (el PATCH solo permite campos no transaccionales)
    assertOwnerOrAdmin(activation.userId, user, 'No tiene permiso para modificar esta activación.');
    return this.updateQrActivateUseCase.execute(id, updateQrActivateDto, tracking);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar activación' })
  async remove(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /qr-activate/:id', { id });
    await this.deleteQrActivateUseCase.execute(id, tracking);
    return { message: 'Activación eliminada exitosamente' };
  }
}
