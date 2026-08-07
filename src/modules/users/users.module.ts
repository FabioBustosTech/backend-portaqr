import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonModule } from '../../common/common.module';
import { UsersController } from './presentation/controllers/users.controller';

import {
  UserSchema,
  UserSchemaDefinition,
} from './infrastructure/repository/mongo/schemas/user.schema';
import { MongoUserRepository } from './infrastructure/repository/mongo/mongo-user.repository';
import { UserRepositoryAdapter } from './infrastructure/adapters/UserRepositoryAdapter';

import { UserValidationRules } from './domain/validators/user-validation.rules';
import { PasswordService } from './domain/services/password.service';
import { CreateUserUseCase } from './application/use-cases/create-user.usecase';
import { GetAllUserUseCase } from './application/use-cases/get-all-user.usecase';
import { GetUserUseCase } from './application/use-cases/get-user.usecase';
import { UpdateUserUseCase } from './application/use-cases/update-user.usecase';
import { IncrementTokenVersionUseCase } from './application/use-cases/increment-token-version.usecase';
import { DeleteUserUseCase } from './application/use-cases/delete-user.usecase';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.usecase';
import { ResendVerificationCodeUseCase } from './application/use-cases/resend-verification-code.usecase';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { ChangePasswordUseCase } from './application/use-cases/change-password.usecase';
import { EmailModule } from '../../shared/email/email.module';

import {
  USER_GET_ALL_PORT,
  USER_GET_PORT,
  USER_CREATE_PORT,
  USER_UPDATE_PORT,
  USER_DELETE_PORT,
  USER_CHECK_PORT,
} from './domain/constants/user.tokens';

@Module({
  imports: [
    CommonModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: UserSchema.name, schema: UserSchemaDefinition },
      // Alias 'User' para que los refs de qr-activate/pet-tag resuelvan el populate
      // (el nombre de clase UserSchema no coincide con ref: 'User')
      { name: 'User', schema: UserSchemaDefinition },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    // Domain Services
    PasswordService,
    UserValidationRules,

    // Use Cases
    CreateUserUseCase,
    GetAllUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    IncrementTokenVersionUseCase,
    DeleteUserUseCase,
    VerifyEmailUseCase,
    ResendVerificationCodeUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,

    // Repositories (Infrastructure)
    MongoUserRepository,
    UserRepositoryAdapter,

    // Puertos segregados (ISP)
    {
      provide: USER_GET_ALL_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: USER_GET_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: USER_CREATE_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: USER_UPDATE_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: USER_DELETE_PORT,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: USER_CHECK_PORT,
      useClass: UserRepositoryAdapter,
    },
  ],
  exports: [
    CreateUserUseCase,
    GetAllUserUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    IncrementTokenVersionUseCase,
    DeleteUserUseCase,
    VerifyEmailUseCase,
    ResendVerificationCodeUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    ChangePasswordUseCase,
    PasswordService,
  ],
})
export class UsersModule {}
