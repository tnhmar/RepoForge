import { useEffect, useRef, useState } from 'react';
import { Button, Text } from 'react-native-paper';
import { useSession } from '../auth';
import { useJobs, type Job } from '../liveStore';
import { inspectPublication } from '../publication';
import { message } from './shared';
export function CheckPublication({ job }: { job: Job }) { const [busy, setBusy] = useState(false); const [detail, setDetail] = useState(''); const controller = useRef<AbortController | null>(null); useEffect(() => () => controller.current?.abort(), []); const check = async () => { if (controller.current) return; const request = new AbortController(); controller.current = request; setBusy(true); try { const outcome = await inspectPublication(job, request.signal); if (!request.signal.aborted && useSession.getState().user?.id === job.userId) { useJobs.getState().update(job.id, { ...outcome, checkpoint: job.checkpoint ? { ...job.checkpoint, publicationStarted: outcome.status === 'unknown' ? job.checkpoint.publicationStarted : false } : undefined }); setDetail(outcome.message); } } catch (cause) { if (!request.signal.aborted) setDetail(message(cause)); } finally { controller.current = null; if (!request.signal.aborted) setBusy(false); } }; return <><Button loading={busy} disabled={busy} onPress={() => void check()}>Check publication result</Button>{detail ? <Text selectable>{detail}</Text> : null}</>; }
