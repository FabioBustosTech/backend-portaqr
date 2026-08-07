import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { UserDocument } from '../users/entities/user.entity';
import { CustomLogger } from '../shared/utils/logger.util';

@Injectable()
export class AuthService {
  private readonly logger = new CustomLogger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, trackingId) {
    this.logger.debug(`Intento de login para usuario/email: ${loginDto.username}`, AuthService.name, 'login', trackingId);
    
    const user = await this.usersService.findByUsername(loginDto.username, trackingId);
    if (!user) {
      this.logger.warn(`Intento de login fallido - Usuario/Email no encontrado: ${loginDto.username}`, AuthService.name, 'login', trackingId);
      throw new UnauthorizedException('El email o nombre de usuario no existe');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Intento de login fallido - Contraseña incorrecta para: ${loginDto.username}`, AuthService.name, 'login', trackingId);
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Actualizar último login
    await this.usersService.updateLastLogin(user._id.toString(), trackingId);

    const tokens = await this.generateTokens(user);
    this.logger.log(`Login exitoso para usuario: ${user.email} (${user.userName})`, AuthService.name, 'login', trackingId);
    
    return {
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
        firstName: user.firstName,
        paternalLastName: user.paternalLastName,
        maternalLastName: user.maternalLastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string, trackingId: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        algorithms: ['HS256']
      });

      if (!decoded.sub || !this.isValidObjectId(decoded.sub)) {
        this.logger.warn('Token inválido o sin sub claim', AuthService.name, 'refreshToken', trackingId);
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.usersService.findOne(decoded.sub, trackingId);
      const tokens = await this.generateTokens(user);
      this.logger.log(`Token refrescado para usuario: ${user.email}`, AuthService.name, 'refreshToken', trackingId);
      
      return tokens;
    } catch (error) {
      this.logger.error('Error al refrescar token:', error.stack, AuthService.name, 'refreshToken', trackingId);
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token de refresco inválido o expirado');
      }
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  private async generateTokens(user: UserDocument) {
    const payload = { 
      sub: user._id, 
      email: user.email,
      userName: user.userName,
      role: user.role ,
      isEmailVerified: user.isEmailVerified,

    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: this.configService.get<string>("JWT_EXPIRATION"),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET") ,
        expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRATION"),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private isValidObjectId(id: string): boolean {
    const ObjectId = require('mongoose').Types.ObjectId;
    return ObjectId.isValid(id);
  }

  async getProfile(userId: string, trackingId: string) {
    try {
      this.logger.log(`Buscando perfil de usuario con ID: ${userId}`, AuthService.name, 'getProfile', trackingId);
      const user = await this.usersService.findOne(userId, trackingId);
      
      if (!user) {
        this.logger.warn(`Usuario no encontrado con ID: ${userId}`, AuthService.name, 'getProfile', trackingId);
        throw new NotFoundException('Usuario no encontrado');
      }

      // Excluir información sensible
      const profile = {
        id: user._id,
        username: user.userName,
        email: user.email,
        firstName: user.firstName,
        paternalLastName: user.paternalLastName,
        maternalLastName: user.maternalLastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      this.logger.log(`Perfil obtenido exitosamente para usuario ID: ${userId}`, AuthService.name, 'getProfile', trackingId);
      return profile;
    } catch (error) {
      this.logger.error(`Error al obtener perfil: ${error.message}`, error.stack, AuthService.name, 'getProfile', trackingId);
      throw error;
    }
  }
}