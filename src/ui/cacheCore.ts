type Entry = { value: unknown; expires: number };
export class ResourceCache {
  private entries = new Map<string, Entry>();
  private flights = new Map<string, Promise<unknown>>();
  private revisions = new Map<string, number>();
  private epoch = 0;
  constructor(private maximum = 160, private clock: () => number = () => Date.now()) {}
  private key(scope: string, resource: string) { return JSON.stringify([scope, resource]); }
  read<T>(scope: string, resource: string): T | undefined { const entry = this.entries.get(this.key(scope, resource)); return entry && entry.expires > this.clock() ? entry.value as T : undefined; }
  invalidate(scope: string, resource: string) { const key = this.key(scope, resource); this.entries.delete(key); this.revisions.set(key, (this.revisions.get(key) || 0) + 1); }
  clear() { this.epoch += 1; this.entries.clear(); this.flights.clear(); this.revisions.clear(); }
  request<T>(scope: string, resource: string, loader: () => Promise<T>, ttl = 60000): Promise<T> {
    const cached = this.read<T>(scope, resource); if (cached !== undefined) return Promise.resolve(cached);
    const key = this.key(scope, resource); const revision = this.revisions.get(key) || 0; const epoch = this.epoch; const flightKey = JSON.stringify([key, revision, epoch]);
    const existing = this.flights.get(flightKey); if (existing) return existing as Promise<T>;
    const task = Promise.resolve().then(loader).then((value) => {
      if (this.epoch === epoch && (this.revisions.get(key) || 0) === revision) {
        while (this.entries.size >= this.maximum) { const oldest = this.entries.keys().next().value; if (oldest === undefined) break; this.entries.delete(oldest); }
        this.entries.set(key, { value, expires: this.clock() + ttl });
      }
      return value;
    });
    this.flights.set(flightKey, task);
    void task.then(() => this.flights.delete(flightKey), () => this.flights.delete(flightKey));
    return task;
  }
}
