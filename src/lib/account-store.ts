export interface SavedAccount {
  email: string;
  userId: string;
  lastUsed: string;
}

const STORAGE_KEY = "webspy_accounts";

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(email: string, userId: string): void {
  if (typeof window === "undefined") return;
  const accounts = getSavedAccounts().filter((a) => a.userId !== userId);
  accounts.unshift({ email, userId, lastUsed: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeAccount(userId: string): void {
  if (typeof window === "undefined") return;
  const accounts = getSavedAccounts().filter((a) => a.userId !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function clearAllAccounts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
