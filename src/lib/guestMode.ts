const GUEST_KEY = 'syllibee-guest-mode';

export function isGuestMode(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function setGuestMode(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(GUEST_KEY, '1');
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}
