const KEY = 'portal_auth_token';
export const tokenStorage = {
  get(): string | null { return localStorage.getItem(KEY); },
  set(token: string): void { localStorage.setItem(KEY, token); },
  clear(): void { localStorage.removeItem(KEY); },
};
