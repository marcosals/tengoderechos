import { AuthStore, MockSession } from './AuthStore';

describe('AuthStore Session Manager', () => {
  beforeEach(() => {
    // Reset session to default before each test
    AuthStore.setSession(null);
  });

  test('should return initial session null', () => {
    expect(AuthStore.getSession()).toBeNull();
  });

  test('should set active session and read it back', () => {
    const mockSession: MockSession = {
      user: {
        id: 'user-uuid-1',
        email: 'test@example.com',
        display_name: 'Test User'
      },
      access_token: 'fake-jwt-token'
    };

    AuthStore.setSession(mockSession);
    expect(AuthStore.getSession()).toEqual(mockSession);
  });

  test('should notify listeners when session is set', () => {
    const mockListener = jest.fn();
    const unsubscribe = AuthStore.subscribe(mockListener);

    const mockSession: MockSession = {
      user: {
        id: 'user-uuid-2',
        email: 'hello@world.com',
        display_name: 'Hello World'
      },
      access_token: 'fake-jwt-token-2'
    };

    AuthStore.setSession(mockSession);

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(mockSession);

    unsubscribe();
  });

  test('should notify listeners when session is cleared (logout)', () => {
    const mockListener = jest.fn();
    
    AuthStore.setSession({
      user: { id: '1', email: 'a@b.com', display_name: 'A' },
      access_token: 't'
    });

    const unsubscribe = AuthStore.subscribe(mockListener);
    AuthStore.setSession(null);

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith(null);

    unsubscribe();
  });
});
