import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { Heading, Icon, Notice, Page, Panel, Row, styles } from '../../src/components/ui';
import { useApp } from '../../src/store';
export default function Home() {
  const router = useRouter(); const theme = useTheme(); const history = useApp((s) => s.history);
  return <Page>
    <Row><Icon name='branch' size={32} /><Text variant='titleLarge' style={{ fontWeight: '800', flex: 1 }}>RepoForge</Text><Text variant='labelSmall' style={{ color: theme.colors.secondary }}>UI PREVIEW</Text></Row>
    <Heading eyebrow='Your mobile workbench' title={'Big ideas.\nReal repositories.'} detail='Bring your complete project to GitHub, without losing its structure.' />
    <View style={{ backgroundColor: theme.colors.primaryContainer, borderRadius: 26, padding: 24, gap: 16 }}>
      <Icon name='upload' size={34} color={theme.colors.onPrimaryContainer} />
      <Text variant='headlineSmall' style={{ color: theme.colors.onPrimaryContainer, fontWeight: '800' }}>One archive. Every file.</Text>
      <Text style={{ color: theme.colors.onPrimaryContainer }}>Preview the journey from a ZIP archive to a repository full of actual files and folders.</Text>
      <Button mode='contained' onPress={() => router.navigate('/import')}>Explore project import</Button>
    </View>
    <Row><View style={styles.grow}><Panel><Text variant='headlineMedium'>{history.length}</Text><Text variant='bodySmall'>Saved local previews</Text></Panel></View><View style={styles.grow}><Panel><Text variant='headlineMedium'>0</Text><Text variant='bodySmall'>Connected accounts</Text></Panel></View></Row>
    <Text variant='titleMedium'>Your workspace</Text>
    <Panel onPress={() => router.navigate('/repositories')}><Row><Icon name='repo' /><View style={styles.grow}><Text variant='titleMedium'>Browse repositories</Text><Text variant='bodySmall'>Search and explore the sample workspace</Text></View><Text>›</Text></Row></Panel>
    <Panel onPress={() => router.navigate('/activity')}><Row><Icon name='activity' /><View style={styles.grow}><Text variant='titleMedium'>Import activity</Text><Text variant='bodySmall'>Your saved previews, kept on this device</Text></View><Text>›</Text></Row></Panel>
    <Notice>This is an interactive UI prototype. Repository data is illustrative. No GitHub account is connected and no files are uploaded.</Notice>
  </Page>;
}
