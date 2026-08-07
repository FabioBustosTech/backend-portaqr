import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule (smoke test)', () => {
  it('debe compilar el módulo raíz con todos los módulos registrados', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('MongooseModule')
      .useValue({})
      .compile();

    expect(moduleRef).toBeDefined();
  });
});