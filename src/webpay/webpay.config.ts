import { ConfigService, registerAs } from '@nestjs/config';


const configService = new ConfigService();

export default registerAs('webpay', () => ({
  commerceCode: configService.get<string>('WEBPAY_COMMERCE_CODE'),
  apiKey: configService.get<string>('WEBPAY_API_KEY'),
  environment: configService.get<string>('NODE_ENV') === 'production' ? 'LIVE' : 'TEST',
}));
