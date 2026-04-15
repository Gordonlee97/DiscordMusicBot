let timer: ReturnType<typeof setTimeout> | null = null;

/** Starts the disconnect countdown. Cancels any existing timer first. */
export function setDisconnectTimer(callback: () => void, ms: number): void {
  clearDisconnectTimer();
  timer = setTimeout(() => {
    timer = null;
    callback();
  }, ms);
}

/** Cancels the pending disconnect timer if one is active. */
export function clearDisconnectTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/** Returns true if a disconnect countdown is currently running. */
export function hasActiveTimer(): boolean {
  return timer !== null;
}
