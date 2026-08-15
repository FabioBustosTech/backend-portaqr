import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserUseCase } from '../../application/use-cases/create-user.usecase';
import { GetAllUserUseCase } from '../../application/use-cases/get-all-user.usecase';
import { GetUserUseCase } from '../../application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.usecase';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.usecase';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.usecase';
import { ResendVerificationCodeUseCase } from '../../application/use-cases/resend-verification-code.usecase';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.usecase';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.usecase';
import { CreateUserDto } from '../../application/dto/create-user.dto';
import { UpdateUserDto } from '../../application/dto/update-user.dto';
import { ChangePasswordDto } from '../../application/dto/change-password.dto';
import { RolesGuard } from '../../../auth/infrastructure/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { Public } from '../../../../common/decorators/public.decorator';
import { GetUser } from '../../../../common/decorators/user.decorator';
import { Tracking } from '../../../../common/decorators/tracking.decorator';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../common/services/trace.service';
import { assertOwnerOrAdmin } from '../../../../common/utils/ownership.utils';
// SPEC-008 H4 (R4): 5 req/min en registro (anti-bruteforce de cuentas)
import { Throttle } from '@nestjs/throttler';
import { SENSITIVE_ENDPOINT_THROTTLE } from 'src/common/config/throttle.config';

interface AuthenticatedUser {
  id: string;
  role: string;
}

@Controller('users')
@ApiTags('users')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getAllUserUseCase: GetAllUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationCodeUseCase: ResendVerificationCodeUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly traceService: TraceService,
  ) {}

  @Post(':id/verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar email de usuario' })
  @ApiResponse({ status: 200, description: 'Email verificado exitosamente' })
  async verifyEmail(
    @Param('id') id: string,
    @Body('code') code: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /users/:id/verify-email', { id });
    await this.verifyEmailUseCase.execute(id, code, tracking);
    return { message: 'Email verificado exitosamente' };
  }

  @Post(':id/resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reenviar código de verificación' })
  @ApiResponse({ status: 200, description: 'Código reenviado exitosamente' })
  async resendVerificationCode(
    @Param('id') id: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /users/:id/resend-verification', { id });
    await this.resendVerificationCodeUseCase.execute(id, tracking);
    return { message: 'Código de verificación reenviado exitosamente' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiResponse({ status: 200, description: 'Código de recuperación enviado exitosamente' })
  async forgotPassword(
    @Body('email') email: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /users/forgot-password', { email });
    await this.forgotPasswordUseCase.execute(email, tracking);
    return { message: 'Código de recuperación enviado exitosamente' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /users/reset-password', { email });
    await this.resetPasswordUseCase.execute(email, code, newPassword, tracking);
    return { message: 'Contraseña actualizada exitosamente' };
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle(SENSITIVE_ENDPOINT_THROTTLE)
  @ApiOperation({ summary: 'Crear un nuevo Usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'POST /users', { email: createUserDto.email });
    return this.createUserUseCase.execute(createUserDto, tracking);
  }

  @Get('check-username/:userName')
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkUserNameExists(
    @Param('userName') userName: string,
    @Tracking() tracking: TrackingContext,
  ): Promise<{ exists: boolean }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users/check-username/:userName', { userName });
    const exists = await this.getUserUseCase.executeByUsername(userName, tracking) !== null;
    return { exists };
  }

  @Get('check-email/:email')
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkEmailExists(
    @Param('email') email: string,
    @Tracking() tracking: TrackingContext,
  ): Promise<{ exists: boolean }> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users/check-email/:email', { email });
    const exists = await this.getUserUseCase.executeByEmail(email, tracking) !== null;
    return { exists };
  }

  @Get('search')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar usuario por username/email (solo admin — SPEC-009 A4)' })
  async findByUsername(
    @Query('username') username: string,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users/search', { username });
    const user = await this.getUserUseCase.executeByUsername(username, tracking);
    if (user) {
      const { password: _password, ...result } = user;
      void _password;
      return result;
    }
    return null;
  }

  @Get('paginated')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener todos los Usuarios paginados' })
  async findPaginatedByUser(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Tracking() tracking: TrackingContext,
    @Query('role') role?: string,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users/paginated', { page, limit, search, role });
    return this.getAllUserUseCase.execute(page, limit, search, role, tracking);
  }

  @Get()
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener todos los Usuarios' })
  async findAll(@Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users');
    const result = await this.getAllUserUseCase.execute(1, 100, undefined, undefined, tracking);
    return result.data;
  }

  @Get(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener el Usuario por id' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'GET /users/:id', { id });

    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido.');
    }

    // SPEC-009 A4: patrón estándar — solo el propio usuario o admin
    assertOwnerOrAdmin(id, user, 'No tiene permiso para ver este usuario.');

    const found = await this.getUserUseCase.execute(id, tracking);
    const { password: _password, ...result } = found;
    void _password;
    return result;
  }

  @Patch(':id/change-password')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ): Promise<void> {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /users/:id/change-password', { id });

    if (!user) {
      throw new UnauthorizedException('User not authenticated.');
    }

    if (user.id !== id) {
      throw new UnauthorizedException('No tiene permiso para cambiar la contraseña de otro usuario.');
    }

    await this.changePasswordUseCase.execute(id, changePasswordDto, tracking);
  }

  @Patch(':id')
  @Roles('admin', 'user')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @GetUser() user: AuthenticatedUser,
    @Tracking() tracking: TrackingContext,
  ) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'PATCH /users/:id', { id });

    if (!user) {
      throw new UnauthorizedException('User not authenticated.');
    }

    // SPEC-009 A1: ObjectId inválido → 400 (evita CastError → 500)
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido.');
    }

    // SPEC-009 A1 (dos capas): fail-fast HTTP — dueño o admin (el usecase repite la regla)
    assertOwnerOrAdmin(id, user, 'No tiene permiso para modificar este usuario.');

    return this.updateUserUseCase.execute(id, updateUserDto, user, tracking);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Tracking() tracking: TrackingContext) {
    this.traceService.log(tracking, TraceLayer.CONTROLLER, 'DELETE /users/:id', { id });
    await this.deleteUserUseCase.execute(id, tracking);
  }
}
