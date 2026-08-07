import type { User } from '../../../../domain/entities/user.entity';
import type { UserSchema } from '../schemas/user.schema';

export class UserMongoMapper {
  static toEntity(doc: UserSchema & { _id?: unknown }): User {
    return {
      id: doc._id?.toString() || '',
      email: doc.email,
      userName: doc.userName,
      password: doc.password,
      firstName: doc.firstName,
      paternalLastName: doc.paternalLastName,
      maternalLastName: doc.maternalLastName,
      role: doc.role || 'user',
      isEmailVerified: doc.isEmailVerified ?? false,
      phone: doc.phone,
      lastLogin: doc.lastLogin,
      verificationCode: doc.verificationCode,
      verificationCodeExpires: doc.verificationCodeExpires,
      passwordResetCode: doc.passwordResetCode,
      passwordResetExpires: doc.passwordResetExpires,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toSchemaData(user: Partial<User>): Partial<UserSchema> {
    return {
      email: user.email,
      userName: user.userName,
      password: user.password,
      firstName: user.firstName,
      paternalLastName: user.paternalLastName,
      maternalLastName: user.maternalLastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      phone: user.phone,
      lastLogin: user.lastLogin,
      verificationCode: user.verificationCode,
      verificationCodeExpires: user.verificationCodeExpires,
      passwordResetCode: user.passwordResetCode,
      passwordResetExpires: user.passwordResetExpires,
    };
  }
}
