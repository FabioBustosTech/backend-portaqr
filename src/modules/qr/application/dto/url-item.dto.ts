import { ApiProperty } from '@nestjs/swagger';

export class UrlListItem {
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
    required: true,
    description: 'Tipo de URL o vCard'
  })
  typeUrl: string;
}
