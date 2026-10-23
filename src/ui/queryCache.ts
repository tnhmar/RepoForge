import { useEffect, useState } from 'react';
import { useSession } from '../auth';
import { ResourceCache } from './cacheCore';
export const queryCache = new ResourceCache();
useSession.subscribe((state, previous) => { if (state.user?.id !== previous.user?.id) queryCache.clear(); });
export function useQuery<T>(resource: string, loader: () => Promise<T>, ttl = 60000) {
  const userId = useSession((state) => state.user?.id); const scope = String(userId || 'signed-out'); const key = `${scope}:${resource}`; const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ key: string; data?: T; loading: boolean; error?: string }>(() => ({ key, data: queryCache.read<T>(scope, resource), loading: true }));
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(async () => {
      if (!alive) return; if (!userId) { setState({ key, loading: false }); return; }
      setState({ key, data: queryCache.read<T>(scope, resource), loading: true });
      try { const data = await queryCache.request(scope, resource, loader, ttl); if (alive && useSession.getState().user?.id === userId) setState({ key, data, loading: false }); }
      catch (error) { if (alive) setState({ key, loading: false, error: error instanceof Error ? error.message : 'Could not load data.' }); }
    });
    return () => { alive = false; };
  }, [resource, key, scope, userId, loader, ttl, version]);
  const visible = state.key === key ? state : { key, data: undefined, loading: true, error: undefined };
  return { ...visible, reload: () => { queryCache.invalidate(scope, resource); setVersion((value) => value + 1); } };
}
