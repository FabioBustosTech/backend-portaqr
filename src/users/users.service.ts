import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';
import { CustomLogger } from '../shared/utils/logger.util';
import { ChangePasswordDto } from './dto/ChangePassword.dto';
import { EmailService } from '../shared/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private readonly logger = new CustomLogger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async checkUserNameExists(userName: string, trackingId: string): Promise<boolean> {
    try {
      this.logger.debug(`Verificando existencia de nombre de usuario: ${userName}`, UsersService.name, 'checkUserNameExists', trackingId);
      const user = await this.userModel.findOne({ userName }).exec();
      if (user) {
        this.logger.debug(`Nombre de usuario "${userName}" ya existe`, UsersService.name, 'checkUserNameExists', trackingId);
      } else {
        this.logger.debug(`Nombre de usuario "${userName}" está disponible`, UsersService.name, 'checkUserNameExists', trackingId);
      }
      return !!user;
    } catch (error) {
      this.logger.error(`Error al verificar nombre de usuario: ${error.message}`, error.stack, UsersService.name, 'checkUserNameExists', trackingId);
      throw new HttpException(
        error.message || 'Error al verificar nombre de usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
   
  }

  async checkEmailExists(email: string, trackingId): Promise<boolean> {
    try {
      this.logger.debug(`Verificando existencia de email: ${email}`, UsersService.name, 'checkEmailExists', trackingId);
      const user = await this.userModel.findOne({ email }).exec();
      if (user) {
        this.logger.debug(`Email "${email}" ya está registrado`, UsersService.name, 'checkEmailExists', trackingId);
      } else {
        this.logger.debug(`Email "${email}" está disponible`, UsersService.name, 'checkEmailExists', trackingId);
      }
      return !!user;
    } catch (error) {
      this.logger.error(`Error al verificar email: ${error.message}`, error.stack, UsersService.name, 'checkEmailExists', trackingId);
      throw new HttpException(
        error.message || 'Error al verificar email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
  }

  
  async changePassword(usuarioId: string, changePasswordDto: ChangePasswordDto, trackingId: string): Promise<void> {
    try {
      this.logger.log(`Inicio de cambio de Contraseña para el usuario ID: ${usuarioId})`, UsersService.name, 'changePassword', trackingId);

      const { currentPassword, newPassword } = changePasswordDto;
      const usuario = await this.userModel.findById(usuarioId);
  
      if (!usuario) {
        this.logger.warn(`Intento de cambio de contraseña fallido: Usuario no encontrado ID: ${usuarioId})`, UsersService.name, 'changePassword', trackingId);
        throw new UnauthorizedException('Usuario no encontrado.');
      }
  
      const isMatch = await bcrypt.compare(currentPassword, usuario.password);
      if (!isMatch) {
        this.logger.warn(`Intento de cambio de contraseña fallido: Contraseña actual incorrecta ID: ${usuarioId})`, UsersService.name, 'changePassword', trackingId);
        throw new UnauthorizedException('La contraseña actual es incorrecta.');
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      usuario.password = hashedPassword;
      await usuario.save();
      this.logger.log(`Contraseña cambiada exitosamente para el usuario ID: ${usuarioId})`, UsersService.name, 'changePassword', trackingId);
    } catch (error) {
      this.logger.error(`Error al cambiar la contraseña: ${error.message}`, error.stack, UsersService.name, 'changePassword', trackingId);
      throw new HttpException(
        error.message || 'Error al cambiar la contraseña',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  
  }

  async create(createUserDto: CreateUserDto, trackingId): Promise<User> {
    try {
      this.logger.debug(`Verificando existencia de email: ${createUserDto.email}`, UsersService.name, 'create', trackingId);
      const existingUser = await this.userModel.findOne({ 
        $or: [
          { email: createUserDto.email },
          { userName: createUserDto.userName }
        ]
      });

      if (existingUser) {
        if (existingUser.email === createUserDto.email) {
          this.logger.warn(`Intento de registro con email existente: ${createUserDto.email}`, UsersService.name, 'create', trackingId);
          throw new ConflictException('El correo electrónico ya está registrado');
        }
        if (existingUser.userName === createUserDto.userName) {
          this.logger.warn(`Intento de registro con nombre de usuario existente: ${createUserDto.userName}`, UsersService.name, 'create', trackingId);
          throw new ConflictException('El nombre de usuario ya está en uso');
        }
      }

      this.logger.debug('Hasheando contraseña', UsersService.name, 'create', trackingId);
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      
      this.logger.debug('Creando nuevo usuario en la base de datos', UsersService.name, 'create', trackingId);
      const createdUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
        role: 'user',
      });

      const savedUser = await createdUser.save();
      this.logger.log(`Usuario creado exitosamente: ${savedUser.email}`, UsersService.name, 'create', trackingId);
      
      // Enviar email de verificación
      try {
        await this.sendVerificationEmail(savedUser._id.toString(), trackingId);
        this.logger.log(`Email de verificación enviado exitosamente a: ${savedUser.email}`, UsersService.name, 'create', trackingId);
      } catch (error) {
        this.logger.error(`Error al enviar email de verificación: ${error.message}`, error.stack, UsersService.name, 'create', trackingId);
        // No lanzamos el error para no afectar la creación del usuario
      }

      return savedUser;
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${error.message}`, error.stack, UsersService.name, 'create', trackingId);
      throw new HttpException(
        error.message || 'Error al crear usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  async findAll(trackingId:string): Promise<User[]> {
    try {
      this.logger.debug('Buscando todos los usuarios', UsersService.name, 'findAll', trackingId);
      const users = await this.userModel.find().select('-password').exec();
      this.logger.log(`Se encontraron ${users.length} usuarios`, UsersService.name, 'findAll', trackingId);
      return users;
    } catch (error) {
      this.logger.error(`Error al buscar usuarios: ${error.message}`, error.stack, UsersService.name, 'findAll', trackingId);
      throw new HttpException(
        error.message || 'Error al buscar usuarios',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
 
  }

  async findOne(id: string, trackingId:string): Promise<UserDocument> {
    try {
      this.logger.debug(`Buscando usuario por ID: ${id}`, UsersService.name, 'findOne', trackingId);
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        this.logger.warn(`Usuario no encontrado con ID: ${id}`, UsersService.name, 'findOne', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
      this.logger.log(`Usuario encontrado: ${user.email}`, UsersService.name, 'findOne', trackingId);
      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario: ${error.message}`, error.stack, UsersService.name, 'findOne', trackingId)
      throw new HttpException(
        error.message || 'Error al buscar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
  }

  async update(id: string, updateUserDto: UpdateUserDto, trackingId: string): Promise<User> {
    try {
      this.logger.debug(`Actualizando usuario con ID: ${id}`, UsersService.name, 'update', trackingId);
    
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, { new: true })
        .select('-password')
        .exec();

      if (!updatedUser) {
        this.logger.warn(`Intento de actualización de usuario inexistente: ${id}`, UsersService.name, 'update', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
      this.logger.log(`Usuario actualizado exitosamente: ${updatedUser.email}`, UsersService.name, 'update', trackingId);
      return updatedUser;
    } catch (error) {
      this.logger.error(`Error al actualizar usuario: ${error.message}`, error.stack, UsersService.name, 'update', trackingId);
      throw new HttpException(
        error.message || 'Error al actualizar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
  }

  async remove(id: string, trackingId:string): Promise<void> {
    try {
      this.logger.debug(`Eliminando usuario con ID: ${id}`, UsersService.name, 'remove', trackingId);
      const result = await this.userModel.findByIdAndDelete(id).exec();
      if (!result) {
        this.logger.warn(`Intento de eliminación de usuario inexistente: ${id}`, UsersService.name, 'remove', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
      this.logger.log(`Usuario eliminado exitosamente: ${id}`, UsersService.name, 'remove');
    } catch (error) {
      this.logger.error(`Error al eliminar usuario: ${error.message}`, error.stack, UsersService.name, 'remove', trackingId);
      throw new HttpException(
        error.message || 'Error al eliminar usuario',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
   
  }

  async findByUsername(usernameOrEmail: string, trackingId): Promise<UserDocument | null> {
    try {
      this.logger.debug(`Buscando usuario por username/email: ${usernameOrEmail}`, UsersService.name, 'findByUsername', trackingId);
      const user = await this.userModel.findOne({
        $or: [
          { email: usernameOrEmail.toLowerCase() },
          { userName: usernameOrEmail }
        ]
      }).exec();

      if (user) {
        this.logger.debug(`Usuario encontrado: ${user.email} (${user.userName})`, UsersService.name, 'findByUsername', trackingId);
      } else {
        this.logger.debug(`No se encontró usuario con username/email: ${usernameOrEmail}`, UsersService.name, 'findByUsername', trackingId);
      }

      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por username/email: ${error.message}`, error.stack, UsersService.name, 'findByUsername', trackingId);
      throw new HttpException(
        error.message || 'Error al buscar usuario por username/email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
  }

  async updateLastLogin(userId: string, trackingId:string): Promise<void> {
    try {
      this.logger.debug(`Actualizando última fecha de login para usuario: ${userId}`, UsersService.name, 'updateLastLogin', trackingId);
      await this.userModel.findByIdAndUpdate(userId, {
        lastLogin: new Date()
      }).exec();
    } catch (error) {
      this.logger.error(`Error al actualizar última fecha de login: ${error.message}`, error.stack, UsersService.name, 'updateLastLogin', trackingId);
      throw new HttpException(
        error.message || 'Error al actualizar última fecha de login',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  
  }

  // Método interno para crear usuarios admin (no expuesto vía API)
  async createAdmin(adminData: CreateUserDto, trackingId): Promise<User> {
    try {
      this.logger.debug(`Creando usuario admin: ${adminData.email}`, UsersService.name, 'createAdmin', trackingId);
      const existingUser = await this.userModel.findOne({ 
        $or: [
          { email: adminData.email },
          { userName: adminData.userName }
        ]
      });
  
      if (existingUser) {
        this.logger.warn(`Intento de creación de usuario admin con email/username existente: ${adminData.email}/${adminData.userName}`, UsersService.name, 'createAdmin', trackingId);
        throw new ConflictException('El usuario ya existe');
      }
  
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const adminUser = new this.userModel({
        ...adminData,
        password: hashedPassword,
        role: 'admin',
      });
  
      return adminUser.save();
    } catch (error) {
      this.logger.error(`Error al crear usuario admin: ${error.message}`, error.stack, UsersService.name, 'createAdmin', trackingId);
      throw new HttpException( 
        error.message || 'Error al crear usuario admin',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
    
  }

  async findPaginatedByUser( page: number = 1, limit: number = 10, search: string = '', trackingId: string): Promise<{ data: UserDocument[], pagination: { total: number, totalPages: number, currentPage: number, limit: number, hasNextPage: boolean, hasPrevPage: boolean } }> {
    try {
      this.logger.log(
        `Iniciando búsqueda paginada - Página: ${page}, Límite: ${limit}, Búsqueda: ${search}`,
        UsersService.name,
        'findPaginatedByUser', 
        trackingId
      );

      // Construir el query base
      const query: any = {role: "user" };

      // Agregar condiciones de búsqueda si existe un término
      if (search) {
        query.$or = [
          { userName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Calcular el skip para la paginación
      const skip = (page - 1) * limit;

      // Ejecutar las consultas en paralelo
      const [data, total] = await Promise.all([
        this.userModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(query)
      ]);

      // Calcular el total de páginas
      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Búsqueda completada - Total: ${total}, Páginas: ${totalPages}, Resultados: ${data.length}`,
        UsersService.name,
        'findPaginatedByUser', 
        trackingId
      );

      return {
        data,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      this.logger.error(
        `Error en búsqueda paginada: ${error.message}`,
        error.stack,
        UsersService.name,
        'findPaginatedByUser', 
        trackingId
      );
      throw new HttpException(  
        error.message || 'Error en búsqueda paginada',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async generateVerificationCode(userId: string, trackingId: string): Promise<string> {
    try {
      this.logger.debug(`Generando código de verificación para usuario: ${userId}`, UsersService.name, 'generateVerificationCode', trackingId);
    
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiryTime = new Date();
      expiryTime.setSeconds(expiryTime.getSeconds() + parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')));
  
      await this.userModel.findByIdAndUpdate(userId, {
        verificationCode,
        verificationCodeExpires: expiryTime,
      });
      
      this.logger.log(`Código de verificación generado: ${verificationCode}`, UsersService.name, 'generateVerificationCode', trackingId);
      return verificationCode;
    } catch (error) {
      this.logger.error(`Error al generar código de verificación: ${error.message}`, error.stack, UsersService.name, 'generateVerificationCode', trackingId);
      throw new HttpException(
        error.message || 'Error al generar código de verificación',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
   
  }

  async sendVerificationEmail(userId: string, trackingId:string): Promise<void> {
    try {
      this.logger.debug(`Enviando email de verificación para usuario: ${userId}`, UsersService.name, 'sendVerificationEmail', trackingId);
    
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${userId}`, UsersService.name, 'sendVerificationEmail', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
  
      const verificationCode = await this.generateVerificationCode(userId, trackingId);
      await this.emailService.sendVerificationEmail(user.email,user._id.toString(), verificationCode);
    } catch (error) {
      this.logger.error(`Error al enviar email de verificación: ${error.message}`, error.stack, UsersService.name, 'sendVerificationEmail', trackingId);
      throw new HttpException(
        error.message || 'Error al enviar email de verificación',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
   
  }

  async verifyEmail(userId: string, code: string, trackingId:string): Promise<boolean> {
    try {
      this.logger.debug(`Verificando email para usuario: ${userId}`, UsersService.name, 'verifyEmail');
    
    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      this.logger.warn(`Email ya verificado: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
      throw new BadRequestException('El email ya está verificado');
    }

    if (!user.verificationCode || !user.verificationCodeExpires) {
      this.logger.warn(`No hay código de verificación pendiente: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
      throw new BadRequestException('No hay código de verificación pendiente');
    }

    if (user.verificationCode !== code) {
      this.logger.warn(`Código de verificación inválido: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
      throw new BadRequestException('Código de verificación inválido');
    }

    if (new Date() > user.verificationCodeExpires) {
      this.logger.warn(`Código de verificación expirado: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
      throw new BadRequestException('El código de verificación ha expirado');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      verificationCode: null,
      verificationCodeExpires: null,
    });
    this.logger.log(`Email verificado exitosamente: ${userId}`, UsersService.name, 'verifyEmail', trackingId);
    return true;
    } catch (error) {
      this.logger.error(`Error al verificar email: ${error.message}`, error.stack, UsersService.name, 'verifyEmail', trackingId);
      throw new HttpException(
        error.message || 'Error al verificar email',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
  }

  async resendVerificationCode(userId: string, trackingId:string): Promise<void> {
    try {
      this.logger.debug(`Reenviando código de verificación para usuario: ${userId}`, UsersService.name, 'resendVerificationCode', trackingId);
    
      const user = await this.userModel.findById(userId);
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${userId}`, UsersService.name, 'resendVerificationCode', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
  
      if (user.isEmailVerified) {
        this.logger.warn(`Email ya verificado: ${userId}`, UsersService.name, 'resendVerificationCode', trackingId);
        throw new BadRequestException('El email ya está verificado');
      }
      this.logger.debug(`Enviando email de verificación para usuario: ${userId}`, UsersService.name, 'resendVerificationCode', trackingId);
      await this.sendVerificationEmail(userId, trackingId);
    } catch (error) {
      this.logger.error(`Error al reenviar código de verificación: ${error.message}`, error.stack, UsersService.name, 'resendVerificationCode', trackingId);
      throw new HttpException(
        error.message || 'Error al reenviar código de verificación',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
   
  }

  async generatePasswordResetCode(email: string, trackingId): Promise<string> {
    try {
      this.logger.debug(`Generando código de recuperación para email: ${email}`, UsersService.name, 'generatePasswordResetCode', trackingId);
    
      const user = await this.userModel.findOne({ email });
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${email}`, UsersService.name, 'generatePasswordResetCode', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
  
      const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiryTime = new Date();
      expiryTime.setSeconds(expiryTime.getSeconds() + parseInt(this.configService.get('EMAIL_VERIFICATION_EXPIRY')));
      
      await this.userModel.findByIdAndUpdate(user._id, {
        passwordResetCode: resetCode,
        passwordResetExpires: expiryTime,
      });
      this.logger.log(`Código de recuperación generado: ${resetCode}`, UsersService.name, 'generatePasswordResetCode', trackingId);
      return resetCode;
    } catch (error) {
      this.logger.error(`Error al generar código de recuperación: ${error.message}`, error.stack, UsersService.name, 'generatePasswordResetCode', trackingId);
      throw new HttpException(
        error.message || 'Error al generar código de recuperación',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
   
  }

  async sendPasswordResetEmail(email: string, trackingId:string): Promise<void> {
    try {
      this.logger.debug(`Enviando email de recuperación para: ${email}`, UsersService.name, 'sendPasswordResetEmail', trackingId);

      const user = await this.userModel.findOne({ email });
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${email}`, UsersService.name, 'resetPassword', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
      
      const resetCode = await this.generatePasswordResetCode(email ,trackingId);
      await this.emailService.sendPasswordResetEmail(email, resetCode, `${user.firstName} ${user.paternalLastName} ${user.maternalLastName}`);
      this.logger.log(`Email de recuperación enviado exitosamente a: ${email}`, UsersService.name, 'sendPasswordResetEmail', trackingId);
    } catch (error) {
      this.logger.error(`Error al enviar email de recuperación: ${error.message}`, error.stack, UsersService.name, 'sendPasswordResetEmail', trackingId);
      throw new HttpException(
        error.message || 'Error al enviar email de recuperación',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    
  }

  async resetPassword(email: string, code: string, newPassword: string, trackingId): Promise<boolean> {
    try {
      this.logger.debug(`Reseteando contraseña para: ${email}`, UsersService.name, 'resetPassword', trackingId);
    
      const user = await this.userModel.findOne({ email });
      if (!user) {
        this.logger.warn(`Usuario no encontrado: ${email}`, UsersService.name, 'resetPassword', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }
  
      if (!user.passwordResetCode || !user.passwordResetExpires) {
        this.logger.warn(`No hay código de recuperación pendiente: ${email}`, UsersService.name, 'resetPassword', trackingId);
        throw new BadRequestException('No hay código de recuperación pendiente');
      }
  
      if (user.passwordResetCode !== code) {
        this.logger.warn(`Código de recuperación inválido: ${email}`, UsersService.name, 'resetPassword', trackingId);
        throw new BadRequestException('Código de recuperación inválido');
      }
  
      if (new Date() > user.passwordResetExpires) {
        this.logger.warn(`Código de recuperación expirado: ${email}`, UsersService.name, 'resetPassword', trackingId);
        throw new BadRequestException('El código de recuperación ha expirado');
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpires: null,
      });
      this.logger.log(`Contraseña reseteada exitosamente para: ${email}`, UsersService.name, 'resetPassword', trackingId);
      return true;
    } catch (error) {
      this.logger.error(`Error al resetear contraseña: ${error.message}`, error.stack, UsersService.name, 'resetPassword', trackingId);
      throw new HttpException(
        error.message || 'Error al resetear contraseña',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
      
    }
   
  }
}