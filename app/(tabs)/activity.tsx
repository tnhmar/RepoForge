import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Text } from 'react-native-paper';
import { Heading, Icon, Notice, Page, Panel, Row, styles } from '../../src/components/ui';
import { useApp } from '../../src/store';
export default function Activity() {
  const router = useRouter(); const history = useApp((s) => s.history); const [expanded, setExpanded] = useState<string | null>(null);
  return <Page><Heading eyebrow='On this device' title='Activity' detail='A clear record of your project previews.' /><Notice>These are local previews, not GitHub uploads or successful commits.</Notice>
    {!history.length ? <Panel><Icon name='activity' size={36} /><Text variant='titleLarge'>A clean slate</Text><Text>Save an import preview to see its repository, branch, message, and included paths here.</Text><Button mode='contained' onPress={() => router.navigate('/import')}>Create a preview</Button></Panel> : history.map((item) => <Panel key={item.id} onPress={() => setExpanded(expanded === item.id ? null : item.id)}><Row><Icon name='check' /><Text variant='titleMedium' style={styles.grow}>{item.repository}</Text><Text variant='labelSmall'>LOCAL ONLY</Text></Row><Text>{item.message}</Text><Text variant='bodySmall'>{item.branch} · {item.files} files · {item.mode}</Text><Text variant='bodySmall'>{new Date(item.createdAt).toLocaleString()}</Text>{expanded === item.id ? item.paths.map((path) => <Text key={path} style={styles.mono}>{path}</Text>) : null}</Panel>)}
  </Page>;
}
