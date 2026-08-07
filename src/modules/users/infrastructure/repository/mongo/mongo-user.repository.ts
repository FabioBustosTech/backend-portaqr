import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';
import type { User } from '../../../domain/entities/user.entity';
import type { ICanGetAllUser, ICanGetUser } from '../../../domain/ports/queries/get-user.port';
import type { ICanCreateUser, ICanUpdateUser, ICanDeleteUser, ICanCheckUser } from '../../../domain/ports/queries/create-user.port';
import { UserSchema, UserDocument } from './schemas/user.schema';
import { UserMongoMapper } from './mappers/user-mongo.mapper';
import type { PaginatedResult } from '../../../../../common/dto/pagination.dto';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';

@Injectable()
export class MongoUserRepository
  implements
    ICanGetAllUser,
    ICanGetUser,
    ICanCreateUser,
    ICanUpdateUser,
    ICanDeleteUser,
    ICanCheckUser
{
  private readonly logger = new Logger(MongoUserRepository.name);

  constructor(
    @InjectModel(UserSchema.name)
    private readonly userModel: Model<UserDocument>,
    private readonly traceService: TraceService,
  ) {}

  async getAll(
    page: number,
    limit: number,
    search: string | undefined,
    tracking: TrackingContext,
  ): Promise<PaginatedResult<User>> {
    try {
      const skip = (page - 1) * limit;
      const filter: Record<string, unknown> = { role: 'user' };

      if (search) {
        filter.$or = [
          { userName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      this.traceService.log(tracking, TraceLayer.REPOSITORY, 'getAll:init', { page, limit, search });

      const [data, total] = await Promise.all([
        this.userModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
        this.userModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: data.map((doc) => UserMongoMapper.toEntity(doc)),
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getAll:error', error as Error);
      throw error;
    }
  }

  async getById(id: string, tracking: TrackingContext): Promise<User | null> {
    try {
      const user = await this.userModel.findById(id).lean().exec();
      return user ? UserMongoMapper.toEntity(user) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getById:error', error as Error);
      throw error;
    }
  }

  async getByEmail(email: string, tracking: TrackingContext): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ email }).lean().exec();
      return user ? UserMongoMapper.toEntity(user) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByEmail:error', error as Error);
      throw error;
    }
  }

  async getByUsername(usernameOrEmail: string, tracking: TrackingContext): Promise<User | null> {
    try {
      const user = await this.userModel
        .findOne({
          $or: [
            { email: usernameOrEmail.toLowerCase() },
            { userName: usernameOrEmail },
          ],
        })
        .lean()
        .exec();
      return user ? UserMongoMapper.toEntity(user) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByUsername:error', error as Error);
      throw error;
    }
  }

  async getByVerificationCode(code: string, tracking: TrackingContext): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ verificationCode: code }).lean().exec();
      return user ? UserMongoMapper.toEntity(user) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByVerificationCode:error', error as Error);
      throw error;
    }
  }

  async getByPasswordResetCode(code: string, tracking: TrackingContext): Promise<User | null> {
    try {
      const user = await this.userModel.findOne({ passwordResetCode: code }).lean().exec();
      return user ? UserMongoMapper.toEntity(user) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'getByPasswordResetCode:error', error as Error);
      throw error;
    }
  }

  async create(user: User, tracking: TrackingContext): Promise<User> {
    try {
      const nuevoUsuario = new this.userModel(UserMongoMapper.toSchemaData(user));
      const saved = await nuevoUsuario.save();
      return UserMongoMapper.toEntity(saved);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'create:error', error as Error);
      throw error;
    }
  }

  async createAdmin(user: User, tracking: TrackingContext): Promise<User> {
    try {
      const adminData = { ...UserMongoMapper.toSchemaData(user), role: 'admin' };
      const adminUser = new this.userModel(adminData);
      const saved = await adminUser.save();
      return UserMongoMapper.toEntity(saved);
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'createAdmin:error', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<User>,
    tracking: TrackingContext,
  ): Promise<User | null> {
    try {
      const actualizado = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: UserMongoMapper.toSchemaData(data) },
          { new: true },
        )
        .lean()
        .exec();
      return actualizado ? UserMongoMapper.toEntity(actualizado) : null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'update:error', error as Error);
      throw error;
    }
  }

  async updateLastLogin(userId: string, tracking: TrackingContext): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(userId, { lastLogin: new Date() }).exec();
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'updateLastLogin:error', error as Error);
      throw error;
    }
  }

  async delete(id: string, tracking: TrackingContext): Promise<boolean> {
    try {
      const resultado = await this.userModel.findByIdAndDelete(id).exec();
      return resultado !== null;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'delete:error', error as Error);
      throw error;
    }
  }

  async checkUserNameExists(userName: string, tracking: TrackingContext): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({ userName }).exec();
      return !!user;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'checkUserNameExists:error', error as Error);
      throw error;
    }
  }

  async checkEmailExists(email: string, tracking: TrackingContext): Promise<boolean> {
    try {
      const user = await this.userModel.findOne({ email }).lean().exec();
      return !!user;
    } catch (error) {
      this.traceService.error(tracking, TraceLayer.REPOSITORY, 'checkEmailExists:error', error as Error);
      throw error;
    }
  }
}
