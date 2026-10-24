import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Button, Searchbar, Text } from 'react-native-paper';
import { useSession } from '../auth';
import { Heading, Notice, Page, Panel, Row } from '../components/ui';
import { refreshRepositories, useRepositoryIndex } from '../ux/repositoryIndex';
export function RepositoriesScreen() {
  const user = useSession((state) => state.user); const index = useRepositoryIndex(); const [query, setQuery] = useState(''); const router = useRouter();
  useEffect(() => { if (user && (!index.attempted || index.userId !== user.id)) void Promise.resolve().then(refreshRepositories); }, [user?.id, index.attempted, index.userId]);
  const rows = index.userId === user?.id ? index.rows.filter((repo) => `${repo.fullName} ${repo.description}`.toLowerCase().includes(query.toLowerCase())) : [];
  return <Page scroll={false}><FlatList data={rows} keyExtractor={(repo) => String(repo.id)} keyboardShouldPersistTaps='handled' refreshing={index.loading} onRefresh={() => void refreshRepositories()} ListHeaderComponent={<View style={{ gap: 14, paddingBottom: 16 }}><Heading eyebrow='1 · Destination' title='Select a repository' detail='Choose where to publish your ZIP project, or create a repository first.' /><Row><Button mode='contained' onPress={() => router.push('/new-repository')}>Create repository</Button><Button disabled={index.loading} onPress={() => void refreshRepositories()}>Refresh</Button><Button onPress={() => router.navigate({ pathname: '/connect', params: { manage: '1' } })}>Manage access</Button></Row><Searchbar placeholder='Search connected repositories' value={query} onChangeText={setQuery} />{index.error ? <Notice>{index.error}</Notice> : null}</View>} renderItem={({ item }) => <View style={{ marginBottom: 10 }}><Panel onPress={item.archived ? undefined : () => router.push({ pathname: '/import', params: { repo: item.fullName } })}><Text variant='titleMedium'>{item.fullName}</Text>{item.description ? <Text>{item.description}</Text> : null}<Text variant='bodySmall'>{item.private ? 'Private' : 'Public'}{item.archived ? ' · Archived: cannot upload' : ' · Tap to upload ZIP'}</Text></Panel></View>} ListEmptyComponent={index.loading ? <ActivityIndicator /> : <Notice>No matching connected repositories. Manage access on GitHub, return and refresh; newly created repositories may need to be added to the app installation.</Notice>} /></Page>;
}
