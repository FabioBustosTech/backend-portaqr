// pet-tag.controller.ts
import { Controller, Post, Get, Patch, Body, Param, UseGuards, Query, Req, HttpCode, HttpStatus, UseInterceptors, UseFilters, HttpException } from '@nestjs/common';
import { PetTagService } from './pet-tag.service';
import { ActivatePetTagDto } from './dto/activate-pet-tag.dto';
import { QueryReservedTagsDto } from './dto/query-reserved-tags.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CustomLogger } from 'src/shared/utils/logger.util';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeneratePetTagsDto } from './dto/generate-pet-tags.dto';
import { UpdatePetTagDto } from './dto/update-pet-tag.dto';

@Controller('pet-tag')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PetTagController {
  private readonly logger = new CustomLogger(PetTagController.name);
  private readonly trackingId = 'pet-tag-controller';

  constructor(private readonly petTagService: PetTagService) {}

  // --- RUTA DE ADMINISTRACIÃ“N ---
  @Post('admin/generate')
  @Roles('admin')
  @ApiOperation({ summary: 'Generar un lote de placas de mascota' })
  @ApiResponse({ status: 200, description: 'Lote de placas generadas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async generatePetTags(@Body() generateDto: GeneratePetTagsDto) {
    try {
      this.logger.log(
        `Generando ${generateDto.quantity} placas de mascota`,
        PetTagController.name,
        'generateBatch',
        this.trackingId
      );
      const result = await this.petTagService.generateBatch(generateDto.quantity, generateDto.assignedStoreName);
      this.logger.log(
        `GeneraciÃ³n exitosa de ${result.length} placas de mascota`,
        PetTagController.name,
        'generateBatch',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al generar placas de mascota: ${error.message}`,
        error.stack,
        PetTagController.name,
        'generateBatch',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al generar placas de mascota',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // --- NUEVA RUTA DE ADMINISTRACIÃ“N PARA CONSULTAR ---
  @Get('admin/reserved')
  @Roles('admin')
  @ApiOperation({ summary: 'Consultar placas reservadas' })
  @ApiResponse({ status: 200, description: 'Placas reservadas obtenidas exitosamente', type: [GeneratePetTagsDto] })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getReservedPetTags(@Query() queryDto: QueryReservedTagsDto) {
    try {
      this.logger.log(
        `Consultando placas reservadas con parÃ¡metros: ${JSON.stringify(queryDto)}`,
        PetTagController.name,
        'findReserved',
        this.trackingId
      );
      const result = await this.petTagService.findReserved(queryDto);
      this.logger.log(
        `Encontradas ${result.data.length} placas reservadas`,
        PetTagController.name,
        'findReserved',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al consultar placas reservadas: ${error.message}`,
        error.stack,
        PetTagController.name,
        'findReserved',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al consultar placas reservadas',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  // --- RUTA PÃšBLICA ---
  @Get('public/status/:idQr')
  @Public()
  @ApiOperation({ summary: 'Consultar estado de una placa de mascota' })
  @ApiResponse({ status: 200, description: 'Estado de la placa obtenido exitosamente', type: GeneratePetTagsDto })
  @ApiResponse({ status: 400, description: 'Error en la solicitud' })
  @HttpCode(HttpStatus.OK)
  async getPetTagStatus(@Param('idQr') idQr: string) {
    try {
      this.logger.log(
        `Consultando estado de placa con ID QR: ${idQr}`,
        PetTagController.name,
        'getStatus',
        this.trackingId
      );
      const result = await this.petTagService.getStatus(idQr);
      this.logger.log(
        `Estado encontrado para ID QR: ${idQr}`,
        PetTagController.name,
        'getStatus',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al consultar estado de placa: ${error.message}`,
        error.stack,
        PetTagController.name,
        'getStatus',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al consultar estado de placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
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
    @Req() req: any // Para obtener el userId del usuario autenticado
  ) {
    try {
      this.logger.log(
        `Actualizando datos de placa con ID: ${petTagId} para usuario: ${req.user.id}`,
        PetTagController.name,
        'updatePetTag',
        this.trackingId
      );
      const result = await this.petTagService.update(petTagId, req.user.id, updateDto);
      this.logger.log(
        `Datos actualizados exitosamente para placa ID: ${petTagId}`,
        PetTagController.name,
        'updatePetTag',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al actualizar datos de placa: ${error.message}`,
        error.stack,
        PetTagController.name,
        'updatePetTag',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al actualizar datos de placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
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
    @Req() req: any // Para obtener el userId del usuario autenticado
  ) {
    try {
      const userId = req.user.id;
      this.logger.log(
        `Activando placa con ID QR: ${activateDto.idQr} para usuario: ${userId}`,
        PetTagController.name,
        'activate',
        this.trackingId
      );
      const result = await this.petTagService.activate(activateDto, userId);
      this.logger.log(
        `ActivaciÃ³n exitosa de placa con ID QR: ${activateDto.idQr}`,
        PetTagController.name,
        'activate',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al activar placa: ${error.message}`,
        error.stack,
        PetTagController.name,
        'activate',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al activar placa',
        error.status || HttpStatus.BAD_REQUEST
      );
    }
  }
  
  // --- RUTA PARA ACTUALIZAR POR QR ID ---
  @Patch(':idQr')
  @Roles('admin', 'user')
  @ApiOperation({ summary: 'Actualizar la informaciÃ³n de una PetTag' })
  @ApiResponse({ status: 200, description: 'Placa actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Placa no encontrada o no pertenece al usuario' })
  @HttpCode(HttpStatus.OK)
  async updatePetTagByQrId(
    @Param('idQr') idQr: string,
    @Body() updateDto: UpdatePetTagDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(
        `Actualizando datos de placa con ID QR: ${idQr} para usuario: ${req.user.id}`,
        PetTagController.name,
        'updatePetTagByQrId',
        this.trackingId
      );
      console.log('updatePetTagByIdQr', idQr, req.user.id, updateDto);
      
      const result = await this.petTagService.update(idQr, req.user.id, updateDto);
      this.logger.log(
        `Datos actualizados exitosamente para placa ID QR: ${idQr}`,
        PetTagController.name,
        'updatePetTagByQrId',
        this.trackingId
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error al actualizar datos de placa: ${error.message}`,
        error.stack,
        PetTagController.name,
        'updatePetTagByQrId',
        this.trackingId
      );
      throw new HttpException(
        error.message || 'Error al actualizar datos de placa',
        error.status || HttpStatus.NOT_FOUND
      );
    }
  }

 
}