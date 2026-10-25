import { create } from 'zustand';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { useSession } from '../auth';
import { useCreation } from '../creation/runner';
import { readZip, ZIP_LIMIT, type ProjectFile } from '../zip';
import { message, useTransfer, validFull } from './shared';
export type Project = { id: string; userId: number; name: string; compressed: number; files: ProjectFile[] };
export const useProject = create<{ project: Project | null; destination: string; branch: string; selecting: boolean; status: string; error: string }>(() => ({ project: null, destination: '', branch: '', selecting: false, status: '', error: '' }));
export function selectDestination(full: string) { if (validFull(full)) { const old = useProject.getState(); useProject.setState({ destination: full, branch: old.destination.toLowerCase() === full.toLowerCase() ? old.branch : '' }); } }
export function selectBranch(branch: string) { useProject.setState({ branch }); }
export function clearProject(id?: string) { if (!id || useProject.getState().project?.id === id) useProject.setState({ project: null, error: '' }); }
export async function chooseProject(): Promise<boolean> {
  const actor = useSession.getState().user?.id; const selected = useProject.getState(); if (!actor || useTransfer.getState().controller || useCreation.getState().busy) return false;
  if (!selected.destination || !selected.branch) { useProject.setState({ error: 'Select a repository and a branch before choosing the ZIP.' }); return false; }
  const controller = new AbortController(); useTransfer.setState({ controller }); useProject.setState({ selecting: true, status: 'Choose a ZIP…', error: '' }); let cached: File | null = null;
  try { const result = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'], copyToCacheDirectory: true, multiple: false }); if (result.canceled) return false; const asset = result.assets[0]; if (!asset) throw new Error('No file selected.'); cached = new File(asset.uri); if (!asset.name.toLowerCase().endsWith('.zip') || !cached.exists || cached.size > ZIP_LIMIT) throw new Error('Choose a ZIP of at most 20 MiB.'); useProject.setState({ status: 'Checking paths, sizes and archive integrity…' }); const bytes = await cached.bytes(); const files = await readZip(bytes); if (controller.signal.aborted || useSession.getState().user?.id !== actor) return false; useProject.setState({ project: { id: Crypto.randomUUID(), userId: actor, name: asset.name, compressed: bytes.length, files }, error: '' }); return true; }
  catch (cause) { if (useSession.getState().user?.id === actor) useProject.setState({ error: controller.signal.aborted ? 'Selection cancelled. Previous selection is unchanged.' : message(cause) }); return false; }
  finally { if (cached?.uri.startsWith(Paths.cache.uri)) try { cached.delete(); } catch { /* Best effort. */ } if (useTransfer.getState().controller === controller) useTransfer.setState({ controller: null }); useProject.setState({ selecting: false, status: '' }); }
}
useSession.subscribe((state, previous) => { if (state.user?.id !== previous.user?.id) { useTransfer.getState().controller?.abort(); useProject.setState({ project: null, destination: '', branch: '', error: '', status: '' }); } });
