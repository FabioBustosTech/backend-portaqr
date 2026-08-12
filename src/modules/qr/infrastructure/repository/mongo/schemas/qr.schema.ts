import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { QrType } from '../../../../application/dto/create-qr.dto';
import { getMaxPdfItemsPerQr } from '../../../../application/pdf-limits.helper';
import { IsOptional } from 'class-validator';

export type QrDocument = HydratedDocument<QrSchema>;

/**
 * Validación de exclusividad por tipo de item + límite de PDFs (SPEC-005 RF-4/RF-5).
 * - `typeUrl === 'pdf'` → exige `documentUrl`, prohíbe `url` y `vcard`.
 * - `typeUrl === 'vcard'` → exige `vcard`, prohíbe `url` y `documentUrl`.
 * - resto (URL/red social) → exige `url`, prohíbe `vcard` y `documentUrl`.
 * - El conteo de items PDF no puede superar `MAX_PDF_ITEMS_PER_QR` (default 2).
 */
export function isValidQrData(value: any): boolean {
  return validateQrDataFields(value) === true;
}

function validateQrDataFields(value: any): boolean | undefined {
  switch (value.typeQr) {
    case 'dynamic':
    case 'static':
      return value.url && !value.whatsappUrl && !value.emailUrl && !value.phoneUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'whatsapp':
      return value.whatsappUrl && !value.url && !value.emailUrl && !value.phoneUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'email':
      return value.emailUrl && !value.url && !value.whatsappUrl && !value.phoneUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'call':
      return value.phoneUrl && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'wifi':
      return value.wifiData && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.phoneUrl && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'texto':
      return value.text && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.phoneUrl && !value.wifiData && !value.urlList && !value.vcardData && !value.petData;
    case 'list': {
      if (!value.urlList) return false;
      let pdfCount = 0;
      // Exclusividad a nivel de item (RF-4) + conteo de items PDF (RF-5)
      for (const item of value.urlList) {
        if (item.typeUrl === 'pdf') {
          // PDF: exige documentUrl, prohíbe url y vcard
          if (!item.documentUrl || item.url || item.vcard) return false;
          pdfCount += 1;
        } else if (item.typeUrl === 'vcard') {
          // vCard: exige vcard, prohíbe url y documentUrl
          if (!item.vcard || item.url || item.documentUrl) return false;
        } else {
          // URL/red social: exige url, prohíbe vcard y documentUrl
          if (!item.url || item.vcard || item.documentUrl) return false;
        }
      }
      // RF-5: límite de items PDF por QR (env MAX_PDF_ITEMS_PER_QR, default 2).
      if (pdfCount > getMaxPdfItemsPerQr()) return false;
      // Exclusividad a nivel de QR (sin cambios)
      return !value.url && !value.whatsappUrl && !value.emailUrl && !value.phoneUrl
        && !value.wifiData && !value.text && !value.vcardData && !value.petData
        && !value.mapUrl; // SPEC-002: fix bug preexistente (mapUrl no se excluía)
      // listImageUrl se permite opcional — no figura en la exclusividad (RF-4)
    }
    case 'vcard':
      return value.vcardData && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.phoneUrl && !value.wifiData && !value.text && !value.urlList && !value.petData;
    case 'pet':
      return value.petData && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.phoneUrl && !value.wifiData && !value.text && !value.urlList && !value.vcardData;
    case 'phone':
      return value.phoneUrl && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    case 'map':
      return value.mapUrl && !value.url && !value.whatsappUrl && !value.emailUrl &&
             !value.wifiData && !value.text && !value.urlList && !value.vcardData && !value.petData;
    default:
      return false;
  }
}

@Schema({ timestamps: true, collection: 'qrs' })
export class QrSchema {
  @Prop({ required: true, unique: true, trim: true })
  idQr: string;

  @Prop({ required: true, trim: true })
  userId: string;

  @Prop({ required: false })
  expiration?: Date;

  @Prop({ required: false, default: 0 })
  quantityUpdateMonth?: number;

  @Prop({ required: false, trim: true })
  description?: string;

  @Prop({
    type: {
      url: { type: String },
      whatsappUrl: { type: String },
      emailUrl: { type: String },
      phoneUrl: { type: String },
      mapUrl: { type: String },
      wifiData: {
        type: {
          ssid: { type: String },
          security: { type: String, enum: ['WPA', 'WPA2', 'WEP'] },
          password: { type: String }
        },
        required: false,
        _id: false
      },
      text: { type: String },
      urlList: {
        type: [{
          itemId: { type: String, required: false }, // SPEC-005 RF-12
          vcard: { type: SchemaTypes.Mixed }, // Usar la estructura completa de vCardData
          url: { type: String },
          documentUrl: { type: String, required: false, default: null }, // SPEC-005 RF-2
          typeUrl: { 
            type: String,
          }
        }],
        required: false,
        default: undefined,
        _id: false // evita CastError al re-enviar items con _id desde el frontend (edición)
      },
      listImageUrl: { type: String, required: false, default: null }, // SPEC-002: portada QR multilink
      vcardData: {
        type: {
          fn: { type: String }, // Nombre completo
          n: {
            type: {
              lastName: String,
              firstName: String,
              additional: String,
              prefix: String,
              suffix: String
            },
            _id: false
          },
          nickname: String,
          gender: {
            type: String,
            enum: ['M', 'F', 'O', 'N', 'U','']
          },
          bday: String,
          anniversary: String,
          org: String,
          title: String,
          role: String,
          emails: [{
            type: {
              type: String,
              enum: ['work', 'home']
            },
            value: String,
            pref: Number,
            _id: false
          }],
          phones: [{
            type: {
              type: String,
              enum: ['cell', 'work', 'home', 'fax']
            },
            value: String,
            pref: Number,
            _id: false
          }],
          addresses: [{
            type: {
              type: String,
              enum: ['work', 'home']
            },
            street: String,
            city: String,
            region: String,
            postalCode: String,
            country: String,
            label: String,
            _id: false
          }],
          urls: [String],
          photo: String,
          logo: String,
          note: String,
          uid: String,
          rev: String
        },
        required: false,
        _id: false
      },      
      petData: {
        type: {
          ownerName: { type: String },
          address: { type: String },
          phone: { type: String },
          petName: { type: String },
          birthDate: { type: String },
          breed: { type: String },
          gender: { type: String },
          species: { type: String },
          dietFrequency: { type: String },
          diseases: { type: String },
          vaccines: [{
            name: { type: String },
            date: { type: String },
            _id: false
          }],
          observations: { type: String }
        },
        required: false,
        default: undefined,
        _id: false
      },
      typeQr: { type: String, required: true, enum: [
        'dynamic', 'static', 'whatsapp', 'email', 'call', 
        'wifi', 'texto', 'list', 'vcard', 'pet', 'phone', 'map'
      ]}
    },
    required: true,
    _id: false,
    validate: {
      validator: isValidQrData,
      message: 'Los campos del QR deben corresponder con su tipo'
    }
  })
  data: {
    url?: string;
    whatsappUrl?: string;
    emailUrl?: string;
    phoneUrl?: string;
    wifiData?: {
      ssid: string;
      security: string;
      password: string;
    };
    text?: string;
    urlList?: Array<{
      itemId?: string; // SPEC-005 RF-12
      vcard?: unknown;
      url?: string;
      documentUrl?: string | null; // SPEC-005 RF-2 (solo typeUrl === 'pdf')
      typeUrl: string;
    }>;
    listImageUrl?: string | null; // SPEC-002: portada QR multilink
    vcardData?: {
      lastName?: string;
      firstName?: string;
      organization?: string;
      title?: string;
      workPhone?: string;
      homePhone?: string;
      workAddress?: string;
      email?: string;
      url?: string;
      photo?: string;
      note?: string;
      birthday?: string;
      revision?: string;
    };
    petData?: {
      ownerName: string;
      address: string;
      phone: string;
      petName: string;
      birthDate?: string;
      breed?: string;
      gender?: string;
      species?: string;
      dietFrequency?: string;
      diseases?: string;
      vaccines?: Array<{
        name?: string;
        date?: string;
      }>;
      observations?: string;
    };
    mapUrl?: string;
    typeQr: string;
  };
  
  @Prop({ required: false })
  @IsOptional()
  name?: string;

  @Prop({ required: false })
  @IsOptional()
  updatedAt?: Date;

  @Prop({ required: false })
  @IsOptional()
  createdAt?: Date;

  @Prop({ required: false, default: false })
  @IsOptional()
  active?: boolean;

  @Prop({ required: false, default: false })
  @IsOptional()
  isFavorite?: boolean;

  @Prop({ required: false, default: false })
  @IsOptional()
  isOldMode?: boolean;

  @Prop({ required: true, type: String, enum: QrType})
  @IsOptional()
  typeQr: string;
}

export const QrSchemaDefinition = SchemaFactory.createForClass(QrSchema);

// Agregando Ã­ndices
QrSchemaDefinition.index({ userId: 1 });
QrSchemaDefinition.index({ typeQr: 1 });
QrSchemaDefinition.index({ userId: 1, typeQr: 1 });
QrSchemaDefinition.index({ expiration: 1 });
QrSchemaDefinition.index({ createdAt: 1 });
QrSchemaDefinition.index({ updatedAt: 1 });
// SPEC-007 RF-6: soporte del sort { isFavorite: -1, updatedAt: -1 } en findUserByFavorites sin escaneo
QrSchemaDefinition.index({ userId: 1, isFavorite: -1, updatedAt: -1 });

QrSchemaDefinition.pre('save', function(next) {
  this.updatedAt = new Date();
  this.active = this.active ?? false;
  this.isOldMode = this.isOldMode ?? false;
  this.expiration = this.expiration ?? new Date();
  next();
});
