import { create } from 'zustand';
export const useTransfer = create<{ controller: AbortController | null }>(() => ({ controller: null }));
export const validFull = (full: string) => /^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]{1,100}$/.test(full) && !['.', '..'].includes(full.split('/')[1]);
export function message(error: unknown) { const text = error instanceof Error ? error.message : 'Unexpected error'; const corrections: Record<string, string> = { 'Extracted project exceeds 500 MiB.': 'Extracted project exceeds 50 MiB.', 'ZIP directory mismatch or more than 10,000 files.': 'ZIP directory mismatch or more than 300 regular files.' }; return corrections[text] || text; }
