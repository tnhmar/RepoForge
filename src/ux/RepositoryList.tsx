import { useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, TextInput as NativeTextInput, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { useSession } from '../auth';
import { Icon, Page } from '../components/ui';
import { Choice, Empty, InlineError, Loading } from './primitives';
import { refreshRepositories, useRepositoryIndex } from './repositoryIndex';

export function RepositoryListScreen() {
  const user = useSession((s) => s.user); const index = useRepositoryIndex(); const router = useRouter(); const { focus } = useLocalSearchParams<{ focus?: string }>(); const theme = useTheme();
  const [query, setQuery] = useState(''); const [owner, setOwner] = useState('all'); const [visibility, setVisibility] = useState('all'); const [sort, setSort] = useState('updated'); const input = useRef<NativeTextInput>(null);
  useEffect(() => { if (user && (!index.attempted || index.userId !== user.id)) void refreshRepositories(); }, [user, index.attempted, index.userId]);
  useEffect(() => { if (focus === '1') { const id = requestAnimationFrame(() => input.current?.focus()); return () => cancelAnimationFrame(id); } }, [focus]);
  const rows = useMemo(() => index.rows.filter((row) => index.userId === user?.id && (owner === 'all' || row.owner === owner) && (visibility === 'all' || row.private === (visibility === 'private')) && `${row.fullName} ${row.description}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === 'name' ? a.fullName.localeCompare(b.fullName) : b.updatedAt.localeCompare(a.updatedAt)), [index.rows, index.userId, user?.id, owner, visibility, query, sort]);
  if (!user) return <Redirect href='/sign-in' />;
  if (index.userId === user.id && index.complete && !index.loading && !index.rows.length && !index.error) return <Redirect href='/connect' />;

  return <Page scroll={false}>
    <FlatList
      data={rows}
      keyExtractor={(row) => String(row.id)}
      keyboardShouldPersistTaps='handled'
      refreshing={index.loading}
      onRefresh={() => void refreshRepositories()}
      contentContainerStyle={{ paddingBottom: 26 }}
      ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, gap: 2 }}><Text variant='headlineSmall' style={{ fontWeight: '700' }}>Repositories</Text><Text variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{index.rows.length ? `${index.rows.length}${index.complete ? '' : '+'} accessible repositories` : 'Browse the repositories you can access'}</Text></View><Button mode='contained' compact onPress={() => router.push('/new-repository')}>New</Button></View>
        <TextInput ref={input} mode='outlined' placeholder='Search repositories…' value={query} onChangeText={setQuery} autoCapitalize='none' autoCorrect={false} left={<TextInput.Icon icon='magnify' />} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Choice label='Owner' value={owner} onChange={setOwner} items={[{ value: 'all', label: 'All owners' }, ...index.owners.map((login) => ({ value: login, label: login }))]} />
          <Choice label='Visibility' value={visibility} onChange={setVisibility} items={[{ value: 'all', label: 'Any visibility' }, { value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
          <Choice label='Sort' value={sort} onChange={setSort} items={[{ value: 'updated', label: 'Recently updated' }, { value: 'name', label: 'Name' }]} />
        </View>
        {index.error ? <InlineError message={index.complete ? 'Could not fully refresh repositories.' : 'Repository list may be incomplete.'} detail={index.error} retry={() => void refreshRepositories()} /> : null}
      </View>}
      renderItem={({ item }) => <Pressable accessibilityRole='button' accessibilityLabel={`Open ${item.fullName}`} onPress={() => router.push({ pathname: '/repository/[name]', params: { name: item.fullName } })} style={({ pressed }) => ({ paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant, opacity: pressed ? 0.65 : 1 })}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}><Icon name='repo' size={21} /></View>
          <View style={{ flex: 1, gap: 3 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Text style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{item.fullName}</Text><Text variant='labelSmall' style={{ color: theme.colors.onSurfaceVariant }}>{item.private ? 'Private' : 'Public'}</Text></View><Text numberOfLines={2} variant='bodySmall' style={{ color: theme.colors.onSurfaceVariant }}>{item.description || 'No description'}</Text><Text variant='labelSmall' style={{ color: theme.colors.onSurfaceVariant }}>{[item.language, item.archived ? 'Archived' : '', item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleDateString()}` : ''].filter(Boolean).join(' · ')}</Text></View>
          <Icon name='chevron' size={18} />
        </View>
      </Pressable>}
      ListEmptyComponent={index.loading || !index.attempted ? <Loading label='Loading repositories…' /> : index.error && !index.rows.length ? null : <Empty title='No matching repositories' body='Try another name, owner or visibility.' action={<Button onPress={() => { setQuery(''); setOwner('all'); setVisibility('all'); }}>Clear filters</Button>} />}
    />
  </Page>;
}

