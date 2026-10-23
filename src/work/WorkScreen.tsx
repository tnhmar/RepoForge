import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, View } from 'react-native';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import { useSession } from '../auth';
import { api, enc } from '../github';
import { Page } from '../components/ui';
import { githubUrl } from '../ui/navigation';
import { useQuery } from '../ui/queryCache';
import { useRepositoryIndex } from '../ux/repositoryIndex';
import { Empty, InlineError, Loading, PageTitle } from '../ux/primitives';
type Item = { id: number; number: number; title: string; state: string; html_url: string; repository_url: string; user: { login: string }; updated_at: string };
export function WorkScreen() {
  const user = useSession((state) => state.user); const index = useRepositoryIndex(); const theme = useTheme(); const [mode, setMode] = useState('assigned'); const [page, setPage] = useState(1); const [items, setItems] = useState<Item[]>([]); const loadLock = useRef(false);
  const query = mode === 'assigned' ? `is:issue is:open assignee:${user?.login || ''}` : mode === 'authored' ? `is:pr is:open author:${user?.login || ''}` : `is:pr is:open review-requested:${user?.login || ''}`;
  const path = `/search/issues?q=${enc(query)}&sort=updated&per_page=30&page=${page}`;
  const result = useQuery(path, useCallback(() => api<{ items: Item[]; total_count: number; incomplete_results?: boolean }>(path), [path]), 30000);
  useEffect(() => { let alive = true; if (result.data) void Promise.resolve().then(() => { if (!alive) return; setItems((previous) => page === 1 ? result.data!.items : [...new Map([...previous, ...result.data!.items].map((item) => [item.id, item])).values()]); loadLock.current = false; }); if (!result.loading) loadLock.current = false; return () => { alive = false; }; }, [result.data, result.loading, page]);
  const connected = new Set(index.userId === user?.id ? index.rows.map((row) => row.fullName.toLowerCase()) : []);
  const repository = (item: Item) => { const match = /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/?#]+)$/.exec(item.repository_url); return match ? `${match[1]}/${match[2]}` : ''; };
  const visible = items.filter((item) => connected.has(repository(item).toLowerCase()));
  const more = !!result.data && result.data.items.length > 0 && page * 30 < Math.min(result.data.total_count, 1000);
  const next = () => { if (!more || result.loading || loadLock.current) return; loadLock.current = true; setPage((value) => value + 1); };
  return <Page scroll={false}><FlatList data={visible} keyExtractor={(item) => String(item.id)} onEndReached={next} onEndReachedThreshold={0.35} ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 14 }}><PageTitle title='Work' /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[{ key: 'assigned', label: 'Assigned issues' }, { key: 'authored', label: 'My PRs' }, { key: 'reviews', label: 'Review requests' }].map((item) => <Chip key={item.key} selected={mode === item.key} onPress={() => { setItems([]); setPage(1); setMode(item.key); loadLock.current = false; }}>{item.label}</Chip>)}</View><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>Search results are filtered to the connected repository index. Details currently open on GitHub; native detail routes follow in the collaboration commit.</Text>{result.error ? <InlineError message='Could not load your work.' detail={result.error} retry={result.reload} /> : null}{result.data?.incomplete_results ? <Text>GitHub returned incomplete search results.</Text> : null}</View>} renderItem={({ item }) => <Pressable accessibilityRole='link' onPress={() => { if (githubUrl(item.html_url)) void Linking.openURL(item.html_url).catch(() => {}); }} style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant, gap: 5 }}><Text variant='titleMedium'>#{item.number} {item.title} ↗</Text><Text style={{ color: theme.colors.secondary }}>{repository(item)}</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>@{item.user.login} · {item.state}</Text></Pressable>} ListEmptyComponent={result.loading || index.loading ? <Loading label='Loading connected work…' /> : <Empty title='No matching work in the loaded repository index' body='This is scoped to RepoForge’s connected repositories, not every repository on GitHub.' />} ListFooterComponent={result.loading && items.length ? <Loading label='Loading more…' /> : more ? <Button onPress={next}>Load more</Button> : null} /></Page>;
}
