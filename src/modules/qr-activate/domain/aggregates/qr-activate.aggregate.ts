import { QrActivate, ActivationState, WebpayState, WebpayData } from '../entities/qr-activate.entity';
import { randomUUID } from 'crypto';

export interface QrActivateSnapshot extends QrActivate {}

export interface CreateQrActivateProps {
  methodActivation: QrActivate['methodActivation'];
  state?: ActivationState;
  activationDate?: Date;
  TransferDate?: QrActivate['TransferDate'];
  descriptionAdministrator?: string;
  adminId?: string;
  WebpayTransaction?: WebpayData;
  price: QrActivate['price'];
  userId: string;
  description?: string;
  qrList: QrActivate['qrList'];
  documentType: QrActivate['documentType'];
  invoiceData?: QrActivate['invoiceData'];
  sendDocument?: boolean;
}

export class QrActivateAggregate {
  private readonly _id: string;
  private readonly _methodActivation: QrActivate['methodActivation'];
  private readonly _activationDate?: Date;
  private readonly _state: ActivationState;
  private readonly _TransferDate?: QrActivate['TransferDate'];
  private readonly _descriptionAdministrator?: string;
  private readonly _adminId?: string;
  private readonly _WebpayTransaction?: WebpayData;
  private readonly _price: QrActivate['price'];
  private readonly _userId: string;
  private readonly _description?: string;
  private readonly _qrList: QrActivate['qrList'];
  private readonly _documentType: QrActivate['documentType'];
  private readonly _invoiceData?: QrActivate['invoiceData'];
  private readonly _sendDocument?: boolean;
  private readonly _createdAt?: Date;
  private readonly _updatedAt?: Date;

  private constructor(props: QrActivateSnapshot) {
    this._id = props.id;
    this._methodActivation = props.methodActivation;
    this._activationDate = props.activationDate;
    this._state = props.state;
    this._TransferDate = props.TransferDate;
    this._descriptionAdministrator = props.descriptionAdministrator;
    this._adminId = props.adminId;
    this._WebpayTransaction = props.WebpayTransaction;
    this._price = props.price;
    this._userId = props.userId;
    this._description = props.description;
    this._qrList = props.qrList;
    this._documentType = props.documentType;
    this._invoiceData = props.invoiceData;
    this._sendDocument = props.sendDocument;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // ---- Factory methods ----

  static crear(props: CreateQrActivateProps): QrActivateAggregate {
    return new QrActivateAggregate({
      id: randomUUID(),
      methodActivation: props.methodActivation,
      activationDate: props.activationDate,
      state: props.state ?? ActivationState.PENDING,
      TransferDate: props.TransferDate,
      descriptionAdministrator: props.descriptionAdministrator,
      adminId: props.adminId,
      WebpayTransaction: props.WebpayTransaction,
      price: props.price,
      userId: props.userId,
      description: props.description,
      qrList: props.qrList,
      documentType: props.documentType,
      invoiceData: props.invoiceData,
      sendDocument: props.sendDocument,
      createdAt: new Date(),
    });
  }

  static cargarExistente(snap: QrActivateSnapshot): QrActivateAggregate {
    return new QrActivateAggregate(snap);
  }

  // ---- Métodos de negocio ----

  marcarPagada(): QrActivateAggregate {
    return new QrActivateAggregate({
      ...this.toSnapshot(),
      state: ActivationState.PAYED,
    });
  }

  marcarFallida(): QrActivateAggregate {
    return new QrActivateAggregate({
      ...this.toSnapshot(),
      state: ActivationState.FAILED,
    });
  }

  actualizarWebpayState(state: WebpayState): QrActivateAggregate {
    return new QrActivateAggregate({
      ...this.toSnapshot(),
      WebpayTransaction: {
        ...this._WebpayTransaction,
        state,
      },
    });
  }

  // ---- Serialización ----

  toSnapshot(): QrActivateSnapshot {
    return {
      id: this._id,
      methodActivation: this._methodActivation,
      activationDate: this._activationDate,
      state: this._state,
      TransferDate: this._TransferDate,
      descriptionAdministrator: this._descriptionAdministrator,
      adminId: this._adminId,
      WebpayTransaction: this._WebpayTransaction,
      price: this._price,
      userId: this._userId,
      description: this._description,
      qrList: this._qrList,
      documentType: this._documentType,
      invoiceData: this._invoiceData,
      sendDocument: this._sendDocument,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toEntity(): QrActivate {
    return this.toSnapshot();
  }

  // ---- Getters ----

  get id(): string {
    return this._id;
  }
  get methodActivation(): QrActivate['methodActivation'] {
    return this._methodActivation;
  }
  get state(): ActivationState {
    return this._state;
  }
  get WebpayTransaction(): WebpayData | undefined {
    return this._WebpayTransaction;
  }
  get price(): QrActivate['price'] {
    return this._price;
  }
  get userId(): string {
    return this._userId;
  }
  get qrList(): QrActivate['qrList'] {
    return this._qrList;
  }
  get documentType(): QrActivate['documentType'] {
    return this._documentType;
  }
}
