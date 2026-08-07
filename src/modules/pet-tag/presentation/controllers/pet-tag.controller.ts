// pet-tag.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GeneratePetTagsUseCase } from '../../application/use-cases/generate-pet-tags.usecase';
import { GetReservedPetTagsUseCase } from '../../application/use-cases/get-reserved-pet-tags.usecase';
import { GetPetTagStatusUseCase } from '../../application/use-cases/get-pet-tag-status.usecase';
import { UpdatePetTagUseCase } from '../../application/use-cases/update-pet-tag.usecase';
import { ActivatePetTagUseCase } from '../../application/use-cases/activate-pet-tag.usecase';
import { ActivatePetTagDto } from '../../application/dto/activate-pet-tag.dto';
import { QueryReservedTagsDto } from '../../application/dto/query-reserved-tags.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/infrastructure/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { Tracking } from 'src/common/decorators/tracking.decorator';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { GeneratePetTagsDto } from '../../application/dto/generate-pet-tags.dto';
import { UpdatePetTagDto } from '../../application/dto/update-pet-tag.dto';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@Controller('pet-tag')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PetTagController {
  constructor(
    private readonly generatePetTagsUseCase: GeneratePetTagsUseCase,
    private readonly getReservedPetTagsUseCase: GetReservedPetTagsUseCase,
    private readonly getPetTagStatusUseCase: GetPetTagStatusUseCase,
    private readonly updatePetTagUseCase: UpdatePetTagUseCase,
    private readonly activatePetTagUseCase: ActivatePetTagUseCase,
    private readonly traceService: TraceService,
  ) {}

  // --- RUTA DE ADMINISTRACIÓN ---
  @Post('admin/generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Generar un lote de placas de mascota' })
  @ApiResponse({ status: 200, description: 'Lote de placas generadas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async generatePetTags(
    @Body() generateDto: GeneratePetTagsDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /pet-tag/admin/generate', {
      quantity: generateDto.quantity,
    });
    return this.generatePetTagsUseCase.execute(
      generateDto.quantity,
      generateDto.assignedStoreName || '',
      tracking,
    );
  }

  // --- NUEVA RUTA DE ADMINISTRACIÓN PARA CONSULTAR ---
  @Get('admin/reserved')
  @Roles('admin')
  @ApiOperation({ summary: 'Consultar placas reservadas' })
  @ApiResponse({ status: 200, description: 'Placas reservadas obtenidas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getReservedPetTags(
    @Query() queryDto: QueryReservedTagsDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /pet-tag/admin/reserved', {
      queryDto,
    });
    return this.getReservedPetTagsUseCase.execute(queryDto, tracking);
  }

  // --- RUTA PÚBLICA ---
  @Get('public/status/:idQr')
  @Public()
  @ApiOperation({ summary: 'Consultar estado de una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Estado de la placa obtenido exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getPetTagStatus(@Param('idQr') idQr: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /pet-tag/public/status/:idQr', {
      idQr,
    });
    return this.getPetTagStatusUseCase.execute(idQr, tracking);
  }

  // --- RUTA PARA ACTUALIZAR POR ID ---
  @Patch('update/:petTagId')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar datos de una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Datos de la placa actualizados exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async updatePetTag(
    @Param('petTagId') petTagId: string,
    @Body() updateDto: UpdatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/update/:petTagId', {
      petTagId,
      userId: user.id,
    });
    return this.updatePetTagUseCase.execute(petTagId, user.id, updateDto, tracking);
  }

  // --- RUTA PROTEGIDA PARA USUARIOS LOGUEADOS ---
  @Patch('activate')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Activar una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Placa activada exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async activatePetTag(
    @Body() activateDto: ActivatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    const userId = user.id;
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/activate', {
      idQr: activateDto.idQr,
      userId,
    });
    return this.activatePetTagUseCase.execute(
      activateDto.idQr,
      activateDto.activationPin,
      activateDto.petData,
      userId,
      tracking,
    );
  }

  // --- RUTA PARA ACTUALIZAR POR QR ID ---
  @Patch(':idQr')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar la información de una PetTag' })
  @ApiResponse({ status: 200, description: 'Placa actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Placa no encontrada o no pertenece al usuario' })
  @HttpCode(HttpStatus.OK)
  async updatePetTagByQrId(
    @Param('idQr') idQr: string,
    @Body() updateDto: UpdatePetTagDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /pet-tag/:idQr', {
      idQr,
      userId: user.id,
    });
    return this.updatePetTagUseCase.execute(idQr, user.id, updateDto, tracking);
  }
}
