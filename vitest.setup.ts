// Node 25 ships a built-in localStorage stub on globalThis that masks jsdom's
// implementation when tests run via vitest. The stub has no Storage methods
// (clear, getItem, setItem, removeItem), so any test that touches localStorage
// throws. Replace both globalThis.localStorage and window.localStorage with a
// minimal in-memory Storage implementation.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  writable: true,
  configurable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
}
