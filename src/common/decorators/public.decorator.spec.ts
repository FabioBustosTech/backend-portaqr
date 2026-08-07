import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('Public decorator', () => {
  it('debe aplicar metadata isPublic = true', () => {
    @Public()
    class TestController {}

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController);
    expect(metadata).toBe(true);
  });

  it('debe usar la clave IS_PUBLIC_KEY = "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});