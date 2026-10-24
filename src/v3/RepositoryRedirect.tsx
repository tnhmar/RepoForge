import { Redirect, useLocalSearchParams } from 'expo-router';
export function RepositoryRedirect() { const { name } = useLocalSearchParams<{ name?: string }>(); return <Redirect href={{ pathname: '/import', params: { repo: typeof name === 'string' ? name : '' } }} />; }
