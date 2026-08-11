import { ApiProperty } from '@nestjs/swagger';

export class UrlListItem {
  @ApiProperty({ required: false, description: 'Identificador estable del item (SPEC-005 RF-12)' })
  itemId?: string;

  @ApiProperty({ 
    type: Object,
    required: false,
    description: 'Datos de vCard si el tipo es VCARD'
  })
  vcard?: any; // Usar la estructura completa de vCardData

  @ApiProperty({ 
    type: String,
    required: false,
    description: 'URL si el tipo no es VCARD'
  })
  url?: string;

  @ApiProperty({
    type: String,
    required: false,
    nullable: true,
    description: "URL pública R2 del PDF (solo typeUrl === 'pdf')"
  })
  documentUrl?: string | null;

  @ApiProperty({ 
    required: true,
    description: 'Tipo de URL o vCard'
  })
  typeUrl: string;
}
