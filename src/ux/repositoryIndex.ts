import { create } from 'zustand';
import { api, type Installation } from '../github';
import { useSession } from '../auth';
export type RepositoryRow = { id: number; fullName: string; name: string; owner: string; description: string; private: boolean; language: string; updatedAt: string; archived: boolean };
type State = { userId: number | null; rows: RepositoryRow[]; owners: string[]; loading: boolean; attempted: boolean; complete: boolean; error: string; updatedAt: number };
const empty = (): State => ({ userId: null, rows: [], owners: [], loading: false, attempted: false, complete: false, error: '', updatedAt: 0 });
export const useRepositoryIndex = create<State>(() => empty());
let running: { userId: number; task: Promise<void>; controller: AbortController } | null = null;
let serial = 0;
export function refreshRepositories(): Promise<void> {
  const user = useSession.getState().user; if (!user) return Promise.resolve();
  if (running?.userId === user.id) return running.task;
  running?.controller.abort(); const controller = new AbortController(); const expected = ++serial;
  const previous = useRepositoryIndex.getState();
  useRepositoryIndex.setState({ ...(previous.userId === user.id ? previous : empty()), userId: user.id, attempted: true, loading: true, complete: false, error: '' });
  const current = () => expected === serial && useSession.getState().user?.id === user.id && !controller.signal.aborted;
  const task = (async () => {
    const rows = new Map<number, RepositoryRow>(); const owners = new Set<string>(); let capped = false;
    try {
      for (let page = 1; !capped; page += 1) {
        const result = await api<{ installations: Installation[]; total_count: number }>(`/user/installations?per_page=100&page=${page}`, 'GET', undefined, controller.signal);
        for (const installation of result.installations) {
          owners.add(installation.account.login);
          for (let repoPage = 1; ; repoPage += 1) {
            const data = await api<{ repositories: { id: number; name: string; full_name: string; description: string | null; private: boolean; language?: string | null; updated_at: string; archived: boolean }[]; total_count: number }>(`/user/installations/${installation.id}/repositories?per_page=100&page=${repoPage}`, 'GET', undefined, controller.signal);
            for (const repo of data.repositories) { if (rows.size >= 5000 && !rows.has(repo.id)) { capped = true; break; } rows.set(repo.id, { id: repo.id, name: repo.name, fullName: repo.full_name, owner: repo.full_name.split('/')[0], description: repo.description || '', private: repo.private, language: repo.language || '', updatedAt: repo.updated_at, archived: repo.archived }); }
            if (current()) useRepositoryIndex.setState({ rows: [...rows.values()], owners: [...owners] });
            if (capped || repoPage * 100 >= data.total_count || !data.repositories.length) break;
          }
          if (capped) break;
        }
        if (page * 100 >= result.total_count || !result.installations.length) break;
      }
      if (current()) useRepositoryIndex.setState({ rows: [...rows.values()], owners: [...owners], complete: !capped, loading: false, error: capped ? 'This session indexed the first 5,000 repositories. Search covers that index, not all GitHub repositories.' : '', updatedAt: Date.now() });
    } catch (error) { if (current()) useRepositoryIndex.setState({ loading: false, error: error instanceof Error ? error.message : 'Repository access could not be loaded.' }); }
  })();
  running = { userId: user.id, task, controller };
  void task.finally(() => { if (running?.task === task) running = null; });
  return task;
}
useSession.subscribe((state, previous) => { if (state.user?.id !== previous.user?.id) { serial += 1; running?.controller.abort(); running = null; useRepositoryIndex.setState(empty()); } });
