import { setDisconnectTimer, clearDisconnectTimer, hasActiveTimer } from '../../src/utils/disconnectTimer';

beforeEach(() => {
  clearDisconnectTimer();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('disconnectTimer', () => {
  it('fires the callback after the given delay', () => {
    const cb = jest.fn();
    setDisconnectTimer(cb, 1000);
    jest.advanceTimersByTime(999);
    expect(cb).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('reports an active timer', () => {
    setDisconnectTimer(() => {}, 1000);
    expect(hasActiveTimer()).toBe(true);
  });

  it('reports no timer after clear', () => {
    setDisconnectTimer(() => {}, 1000);
    clearDisconnectTimer();
    expect(hasActiveTimer()).toBe(false);
  });

  it('cancels the callback when cleared before firing', () => {
    const cb = jest.fn();
    setDisconnectTimer(cb, 1000);
    clearDisconnectTimer();
    jest.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('replaces an existing timer when set again', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    setDisconnectTimer(cb1, 1000);
    setDisconnectTimer(cb2, 1000);
    jest.advanceTimersByTime(1000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('clears itself after firing', () => {
    setDisconnectTimer(() => {}, 1000);
    jest.advanceTimersByTime(1000);
    expect(hasActiveTimer()).toBe(false);
  });
});
