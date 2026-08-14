import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UploadPetImageUseCase, DeletePetImageUseCase } from './pet-tag-image.usecase';
import { PET_TAG_GET_PORT, PET_TAG_UPDATE_PORT } from '../../domain/constants/pet-tag.tokens';
import { TraceService, TraceLayer } from 'src/common/services/trace.service';
import { ImageProcessorService } from 'src/modules/storage/image-processor.service';
import { StorageService } from 'src/modules/storage/storage.service';
import type { TrackingContext } from 'src/common/decorators/tracking.decorator';
import type { PetData } from '../../domain/entities/pet-tag.entity';

describe('UploadPetImageUseCase (SPEC-016)', () => {
  let useCase: UploadPetImageUseCase;
  let getter: jest.Mocked<{ getOwner: jest.Mock; getStatus: jest.Mock }>;
  let updater: jest.Mocked<{ setPetImageUrl: jest.Mock }>;
  let imageProcessor: jest.Mocked<ImageProcessorService>;
  let storageService: jest.Mocked<StorageService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const ID_QR = 'qr-1';
  const OWNER_ID = 'user-owner';
  const BUFFER = Buffer.from('jpeg-data');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadPetImageUseCase,
        {
          provide: PET_TAG_GET_PORT,
          useValue: { getOwner: jest.fn(), getStatus: jest.fn() },
        },
        {
          provide: PET_TAG_UPDATE_PORT,
          useValue: { setPetImageUrl: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: ImageProcessorService,
          useValue: {
            process: jest.fn().mockResolvedValue({ buffer: Buffer.from('webp'), width: 512, height: 512 }),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadPetImage: jest
              .fn()
              .mockResolvedValue({
                publicUrl: 'https://cdn/pet-tag/qr-1.webp',
                key: 'pet-tag/qr-1.webp',
                size: 4,
              }),
            deleteObject: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TraceService,
          useValue: { log: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UploadPetImageUseCase);
    getter = module.get(PET_TAG_GET_PORT);
    updater = module.get(PET_TAG_UPDATE_PORT);
    imageProcessor = module.get(ImageProcessorService);
    storageService = module.get(StorageService);
  });

  it('debe subir la foto como dueño: procesa → R2 → persiste petImageUrl', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });

    const result = await useCase.execute(ID_QR, OWNER_ID, 'user', BUFFER, tracking);

    expect(imageProcessor.process).toHaveBeenCalledWith(BUFFER);
    expect(storageService.uploadPetImage).toHaveBeenCalledWith({
      idQr: ID_QR,
      buffer: Buffer.from('webp'),
      width: 512,
      height: 512,
    });
    expect(updater.setPetImageUrl).toHaveBeenCalledWith(
      ID_QR,
      OWNER_ID,
      'https://cdn/pet-tag/qr-1.webp',
      tracking,
    );
    expect(result).toEqual({
      petImageUrl: 'https://cdn/pet-tag/qr-1.webp',
      size: 4,
      width: 512,
      height: 512,
    });
  });

  it('debe permitir a un admin subir foto de placa ajena (setPetImageUrl con userId null)', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });

    await useCase.execute(ID_QR, 'admin-id', 'admin', BUFFER, tracking);

    expect(updater.setPetImageUrl).toHaveBeenCalledWith(
      ID_QR,
      null, // admin → sin filtro de dueño
      'https://cdn/pet-tag/qr-1.webp',
      tracking,
    );
  });

  it('debe lanzar 404 si la placa no existe', async () => {
    getter.getOwner.mockResolvedValue(null);

    await expect(
      useCase.execute(ID_QR, OWNER_ID, 'user', BUFFER, tracking),
    ).rejects.toThrow(NotFoundException);
    expect(imageProcessor.process).not.toHaveBeenCalled();
    expect(storageService.uploadPetImage).not.toHaveBeenCalled();
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe lanzar 403 si el requester NO es el dueño ni admin', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });

    await expect(
      useCase.execute(ID_QR, 'otro-usuario', 'user', BUFFER, tracking),
    ).rejects.toThrow(ForbiddenException);
    expect(storageService.uploadPetImage).not.toHaveBeenCalled();
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe lanzar 403 si la placa no tiene dueño (userId null) y el requester no es admin', async () => {
    getter.getOwner.mockResolvedValue({ userId: null });

    await expect(
      useCase.execute(ID_QR, 'cualquiera', 'user', BUFFER, tracking),
    ).rejects.toThrow(ForbiddenException);
  });

  it('debe propagar el error del ImageProcessor (422) sin subir ni persistir nada', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    imageProcessor.process.mockRejectedValue(
      new (require('@nestjs/common').UnprocessableEntityException)('imagen corrupta'),
    );

    await expect(
      useCase.execute(ID_QR, OWNER_ID, 'user', BUFFER, tracking),
    ).rejects.toThrow();
    expect(storageService.uploadPetImage).not.toHaveBeenCalled();
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe propagar el error si R2 falla y NO persistir la URL (sin URL huérfana)', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    storageService.uploadPetImage.mockRejectedValue(new Error('R2 down'));

    await expect(
      useCase.execute(ID_QR, OWNER_ID, 'user', BUFFER, tracking),
    ).rejects.toThrow('R2 down');
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe propagar el error si la persistencia en Mongo falla', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    updater.setPetImageUrl.mockRejectedValue(new Error('DB down'));

    await expect(
      useCase.execute(ID_QR, OWNER_ID, 'user', BUFFER, tracking),
    ).rejects.toThrow('DB down');
  });
});

describe('DeletePetImageUseCase (SPEC-016)', () => {
  let useCase: DeletePetImageUseCase;
  let getter: jest.Mocked<{ getOwner: jest.Mock; getStatus: jest.Mock }>;
  let updater: jest.Mocked<{ setPetImageUrl: jest.Mock }>;
  let storageService: jest.Mocked<StorageService>;

  const tracking: TrackingContext = { trackingId: 't-1', sessionId: 's-1' };
  const ID_QR = 'qr-1';
  const OWNER_ID = 'user-owner';
  const petData: PetData = { ownerName: 'Juan', address: 'Calle 1', phone: '123', petName: 'Rex' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletePetImageUseCase,
        {
          provide: PET_TAG_GET_PORT,
          useValue: { getOwner: jest.fn(), getStatus: jest.fn() },
        },
        {
          provide: PET_TAG_UPDATE_PORT,
          useValue: { setPetImageUrl: jest.fn().mockResolvedValue({}) },
        },
        {
          provide: StorageService,
          useValue: { deleteObject: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TraceService,
          useValue: { log: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeletePetImageUseCase);
    getter = module.get(PET_TAG_GET_PORT);
    updater = module.get(PET_TAG_UPDATE_PORT);
    storageService = module.get(StorageService);
  });

  it('debe borrar la foto: limpia Mongo (null) y borra el objeto R2', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    getter.getStatus.mockResolvedValue({
      status: 'ACTIVO',
      petData: { ...petData, petImageUrl: 'https://cdn/pet-tag/qr-1.webp' },
    });

    const result = await useCase.execute(ID_QR, OWNER_ID, 'user', tracking);

    expect(updater.setPetImageUrl).toHaveBeenCalledWith(ID_QR, OWNER_ID, null, tracking);
    expect(storageService.deleteObject).toHaveBeenCalledWith('https://cdn/pet-tag/qr-1.webp');
    expect(result).toEqual({ petImageUrl: null });
  });

  it('debe ser idempotente: sin URL previa limpia Mongo y NO llama a deleteObject', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    getter.getStatus.mockResolvedValue({ status: 'ACTIVO', petData });

    const result = await useCase.execute(ID_QR, OWNER_ID, 'user', tracking);

    expect(updater.setPetImageUrl).toHaveBeenCalledWith(ID_QR, OWNER_ID, null, tracking);
    expect(storageService.deleteObject).not.toHaveBeenCalled();
    expect(result).toEqual({ petImageUrl: null });
  });

  it('debe permitir admin borrar foto de placa ajena (userId null)', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    getter.getStatus.mockResolvedValue({ status: 'ACTIVO', petData });

    await useCase.execute(ID_QR, 'admin-id', 'admin', tracking);

    expect(updater.setPetImageUrl).toHaveBeenCalledWith(ID_QR, null, null, tracking);
  });

  it('debe lanzar 404 si la placa no existe', async () => {
    getter.getOwner.mockResolvedValue(null);

    await expect(useCase.execute(ID_QR, OWNER_ID, 'user', tracking)).rejects.toThrow(
      NotFoundException,
    );
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe lanzar 403 si el requester NO es el dueño ni admin', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });

    await expect(
      useCase.execute(ID_QR, 'otro-usuario', 'user', tracking),
    ).rejects.toThrow(ForbiddenException);
    expect(updater.setPetImageUrl).not.toHaveBeenCalled();
  });

  it('debe completar el borrado aunque deleteObject falle (mejor esfuerzo — RF-14)', async () => {
    getter.getOwner.mockResolvedValue({ userId: OWNER_ID });
    getter.getStatus.mockResolvedValue({
      status: 'ACTIVO',
      petData: { ...petData, petImageUrl: 'https://cdn/pet-tag/qr-1.webp' },
    });
    storageService.deleteObject.mockRejectedValue(new Error('red down'));

    const result = await useCase.execute(ID_QR, OWNER_ID, 'user', tracking);

    expect(result).toEqual({ petImageUrl: null });
    expect(updater.setPetImageUrl).toHaveBeenCalledWith(ID_QR, OWNER_ID, null, tracking);
  });
});
