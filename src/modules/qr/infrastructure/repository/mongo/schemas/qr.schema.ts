import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { QrType } from '../../../../application/dto/create-qr.dto';
import { IsOptional } from 'class-validator';

export type QrDocument = HydratedDocument<QrSchema>;

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
          vcard: { type: SchemaTypes.Mixed }, // Usar la estructura completa de vCardData
          url: { type: String },
          typeUrl: { 
            type: String,
          }
        }],
        required: false,
        default: undefined
      },
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
      validator: function(value: any) {
        // Validar que los campos solo existan segÃºn el tipo
        switch(value.typeQr) {
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
          case 'list':
            return value.urlList && !value.url && !value.whatsappUrl && !value.emailUrl && 
                   !value.phoneUrl && !value.wifiData && !value.text && !value.vcardData && !value.petData;
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
      },
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
      url: string;
      typeUrl: string;
    }>;
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

QrSchemaDefinition.pre('save', function(next) {
  this.updatedAt = new Date();
  this.active = this.active ?? false;
  this.isOldMode = this.isOldMode ?? false;
  this.expiration = this.expiration ?? new Date();
  next();
});
