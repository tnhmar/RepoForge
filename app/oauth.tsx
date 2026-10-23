import { Redirect } from 'expo-router';
import { useSession } from '../src/auth';
export default function OAuthReturn() { const user = useSession((s) => s.user); return <Redirect href={user ? '/repositories' : '/sign-in'} />; }
