import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { RefreshToken } from '../../../domain/entities/refresh-token.entity';
import type { IRefreshTokenStore } from '../../../domain/ports/refresh-token.port';
import { RefreshTokenSchema, RefreshTokenDocument } from './refresh-token.schema';
import type { TrackingContext } from '../../../../../common/decorators/tracking.decorator';
import { TraceService, TraceLayer } from '../../../../../common/services/trace.service';

@Injectable()
export class MongoRefreshTokenRepository implements IRefreshTokenStore {
  private readonly logger = new Logger(MongoRefreshTokenRepository.name);

  constructor(
    @InjectModel(RefreshTokenSchema.name)
    private readonly model: Model<RefreshTokenDocument>,
    private readonly traceService: TraceService,
  ) {}

  async create(
    data: Pick<RefreshToken, 'userId' | 'tokenHash' | 'expiresAt'>,
    tracking: TrackingContext,
  ): Promise<RefreshToken> {
    this.traceService.log(tracking, TraceLayer.REPOSITORY, 'RefreshToken.create', {
      userId: data.userId,
    });
    const doc = await this.model.create({
      userId: new Types.ObjectId(data.userId),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      createdAt: doc.createdAt,
    };
  }

  async findByHash(tokenHash: string, tracking: TrackingContext): Promise<RefreshToken | null> {
    const doc = await this.model.findOne({ tokenHash }).lean().exec();
    return doc
      ? {
          id: doc._id.toString(),
          userId: doc.userId.toString(),
          tokenHash: doc.tokenHash,
          expiresAt: doc.expiresAt,
          revokedAt: doc.revokedAt,
          createdAt: doc.createdAt,
        }
      : null;
  }

  async revokeByHash(tokenHash: string, tracking: TrackingContext): Promise<void> {
    await this.model
      .updateOne({ tokenHash }, { $set: { revokedAt: new Date() } })
      .exec();
  }

  async revokeAllByUser(userId: string, tracking: TrackingContext): Promise<void> {
    this.traceService.log(tracking, TraceLayer.REPOSITORY, 'RefreshToken.revokeAllByUser', {
      userId,
    });
    await this.model
      .updateMany(
        { userId: new Types.ObjectId(userId), revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      )
      .exec();
  }
}
