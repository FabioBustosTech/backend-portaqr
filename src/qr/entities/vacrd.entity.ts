export class VCardData {
    version: '4.0' = '4.0'; // vCard version
  
    // 👤 Identidad
    fn: string; // Nombre completo
    n?: {
      lastName?: string;
      firstName?: string;
      additional?: string;
      prefix?: string;
      suffix?: string;
    };
    nickname?: string;
    gender?: 'M' | 'F' | 'O' | 'N' | 'U';
    bday?: string;        // Fecha de nacimiento
    anniversary?: string; // Fecha de aniversario
  
    // 🏢 Organización
    org?: string;
    title?: string;
    role?: string;
  
    // 📞 Contacto
    emails?: {
      type?: 'work' | 'home';
      value: string;
      pref?: number;
    }[];
    phones?: {
      type?: 'cell' | 'work' | 'home' | 'fax';
      value: string;
      pref?: number;
    }[];
    addresses?: {
      type?: 'work' | 'home';
      street?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      label?: string;
    }[];
  
    // 🌐 Web y redes
    urls?: string[]; // Sitios web, WhatsApp, LinkedIn...
    photo?: string;  // URL o base64
    logo?: string;
  
    // 🧠 Técnicos y metadatos
    uid?: string;
    rev?: string; // Fecha de revisión
    note?: string;
  }
  