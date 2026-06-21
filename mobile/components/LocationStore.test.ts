import { LocationStore } from './LocationStore';

describe('LocationStore State Manager', () => {
  beforeEach(() => {
    // Reset state to default before each test
    LocationStore.setState('CDMX');
  });

  test('should return initial state CDMX', () => {
    expect(LocationStore.getState()).toBe('CDMX');
  });

  test('should set state to Nuevo León and read it back', () => {
    LocationStore.setState('Nuevo León');
    expect(LocationStore.getState()).toBe('Nuevo León');
  });

  test('should notify listeners when state changes', () => {
    const mockListener = jest.fn();
    const unsubscribe = LocationStore.subscribe(mockListener);

    LocationStore.setState('Jalisco');

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener).toHaveBeenCalledWith('Jalisco');

    unsubscribe();
  });

  test('should not notify unsubscribed listeners', () => {
    const mockListener = jest.fn();
    const unsubscribe = LocationStore.subscribe(mockListener);

    unsubscribe();
    LocationStore.setState('Jalisco');

    expect(mockListener).not.toHaveBeenCalled();
  });
});
