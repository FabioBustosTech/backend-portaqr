import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities/user.entity';
import type { ICanGetAllUser, ICanGetUser } from '../../domain/ports/queries/get-user.port';
import type { ICanCreateUser, ICanUpdateUser, ICanDeleteUser, ICanCheckUser } from '../../domain/ports/queries/create-user.port';
import type { PaginatedResult } from '../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../common/decorators/tracking.decorator';
import { MongoUserRepository } from '../repository/mongo/mongo-user.repository';

@Injectable()
export class UserRepositoryAdapter
  implements
    ICanGetAllUser,
    ICanGetUser,
    ICanCreateUser,
    ICanUpdateUser,
    ICanDeleteUser,
    ICanCheckUser
{
  constructor(private readonly mongoRepository: MongoUserRepository) {}

  async getAll(
    page: number,
    limit: number,
    search: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<User>> {
    return this.mongoRepository.getAll(page, limit, search, tracking);
  }

  async getById(id: string, tracking: TrackingContext): Promise<User | null> {
    return this.mongoRepository.getById(id, tracking);
  }

  async getByEmail(email: string, tracking: TrackingContext): Promise<User | null> {
    return this.mongoRepository.getByEmail(email, tracking);
  }

  async getByUsername(usernameOrEmail: string, tracking: TrackingContext): Promise<User | null> {
    return this.mongoRepository.getByUsername(usernameOrEmail, tracking);
  }

  async getByVerificationCode(code: string, tracking: TrackingContext): Promise<User | null> {
    return this.mongoRepository.getByVerificationCode(code, tracking);
  }

  async getByPasswordResetCode(code: string, tracking: TrackingContext): Promise<User | null> {
    return this.mongoRepository.getByPasswordResetCode(code, tracking);
  }

  async create(user: User, tracking: TrackingContext): Promise<User> {
    return this.mongoRepository.create(user, tracking);
  }

  async createAdmin(user: User, tracking: TrackingContext): Promise<User> {
    return this.mongoRepository.createAdmin(user, tracking);
  }

  async update(
    id: string,
    data: Partial<User>,
    tracking: TrackingContext,
  ): Promise<User | null> {
    return this.mongoRepository.update(id, data, tracking);
  }

  async updateLastLogin(userId: string, tracking: TrackingContext): Promise<void> {
    return this.mongoRepository.updateLastLogin(userId, tracking);
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.delete(id, tracking);
  }

  async checkUserNameExists(userName: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.checkUserNameExists(userName, tracking);
  }

  async checkEmailExists(email: string, tracking: TrackingContext): Promise<boolean> {
    return this.mongoRepository.checkEmailExists(email, tracking);
  }
}
