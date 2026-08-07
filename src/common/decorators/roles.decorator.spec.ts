import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('debe aplicar metadata con los roles indicados', () => {
    @Roles('admin', 'user')
    class TestController {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController);
    expect(metadata).toEqual(['admin', 'user']);
  });

  it('debe aplicar metadata vacía si no se pasan roles', () => {
    @Roles()
    class TestController {}

    const metadata = Reflect.getMetadata(ROLES_KEY, TestController);
    expect(metadata).toEqual([]);
  });

  it('debe usar la clave ROLES_KEY = "roles"', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});