import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Chip, Searchbar, Text, useTheme } from 'react-native-paper';
import { Heading, Icon, Notice, Page, Panel, Row, styles } from '../../src/components/ui';
import { repositories } from '../../src/data';
export default function Repositories() {
  const router = useRouter(); const theme = useTheme(); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All');
  const visible = repositories.filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || r.visibility === filter));
  return <Page><Heading eyebrow='Workspace' title='Repositories' detail='A home for every project.' /><Notice>Demo workspace · not fetched from GitHub.</Notice><Searchbar placeholder='Find a repository' value={query} onChangeText={setQuery} /><Row>{['All', 'Public', 'Private'].map((f) => <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>{f}</Chip>)}</Row>
    {visible.map((repo) => <Panel key={repo.name} onPress={() => router.push({ pathname: '/repository/[name]', params: { name: repo.name } })}><Row><Icon name='repo' /><Text variant='titleMedium' style={styles.grow}>{repo.name}</Text><Text variant='labelSmall'>{repo.visibility}</Text></Row><Text variant='bodyMedium' style={{ color: theme.colors.onSurfaceVariant }}>{repo.description}</Text><Row><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: repo.color }} /><Text variant='bodySmall'>{repo.language}</Text><Icon name='branch' size={14} /><Text variant='bodySmall'>{repo.branch}</Text></Row></Panel>)}
    {!visible.length ? <Panel><Text>No matching repositories. Try a different search or filter.</Text></Panel> : null}
  </Page>;
}
