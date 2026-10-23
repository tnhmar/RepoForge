import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Chip, Text, useTheme } from 'react-native-paper';
import { Heading, Icon, Notice, Page, Panel, Row, styles } from '../../src/components/ui';
import { repositories, sampleFiles } from '../../src/data';
export default function RepositoryDetail() {
  const { name } = useLocalSearchParams<{ name: string }>(); const router = useRouter(); const theme = useTheme(); const [tab, setTab] = useState('Files'); const [selected, setSelected] = useState<string | null>(null);
  const repo = repositories.find((r) => r.name === name);
  if (!repo) return <Page><Button onPress={() => router.back()}>Back</Button><Text>Repository not found in the demo workspace.</Text></Page>;
  return <Page><Button onPress={() => router.back()} style={{ alignSelf: 'flex-start' }}>‹ Repositories</Button><Heading eyebrow='tnhmar · demo' title={repo.name} detail={repo.description} /><Row><Chip>{repo.visibility}</Chip><Chip>{repo.language}</Chip><Chip>main</Chip></Row><Notice>All files and README content below are sample UI data, not the live repository.</Notice><Row>{['Files', 'README'].map((label) => <Chip key={label} selected={tab === label} onPress={() => { setTab(label); setSelected(null); }}>{label}</Chip>)}</Row>
    {tab === 'README' ? <Panel><Text variant='headlineSmall'>{repo.name}</Text><Text>A project built for the next great idea.</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>README rendering preview. Live Markdown loading is not connected yet.</Text></Panel> : selected ? <Panel><Button onPress={() => setSelected(null)}>‹ File tree</Button><Text variant='titleMedium'>{selected}</Text><Text style={styles.mono}>{selected.endsWith('.png') ? 'Binary file preview is not available.' : `// Illustrative file preview\n// ${selected}\n\nLive file loading will be connected in the API milestone.`}</Text></Panel> : sampleFiles.map((path) => <Panel key={path} onPress={() => setSelected(path)}><Row><Icon name='file' size={18} /><Text style={[styles.grow, styles.mono]}>{path}</Text><Text>›</Text></Row></Panel>)}
    <Button mode='contained' onPress={() => router.navigate('/import')}>Open import workbench</Button>
  </Page>;
}
