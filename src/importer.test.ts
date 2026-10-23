import { expect, jest, test } from '@jest/globals';

jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA1: 'SHA-1' }, digest: jest.fn() }));
jest.mock('./github', () => ({}));
import { assembleTree, validBranch } from './importer';
import type { TreeEntry } from './github';
const base: TreeEntry[] = [{ path: 'README.md', type: 'blob', mode: '100644', sha: 'old' }, { path: 'mobile/old.ts', type: 'blob', mode: '100644', sha: 'old' }];
const incoming = [{ path: 'mobile/new.ts', mode: '100644' as const, sha: 'new', data: new Uint8Array() }];
test('additive import preserves unrelated and absent files', () => { expect(assembleTree(base, incoming, 'mobile', false).tree.map((e) => e.path)).toEqual(['README.md', 'mobile/old.ts', 'mobile/new.ts']); });
test('replacement only deletes within the selected destination', () => { const result = assembleTree(base, incoming, 'mobile', true); expect(result.tree.map((e) => e.path)).toEqual(['README.md', 'mobile/new.ts']); expect(result.changes).toContainEqual({ path: 'mobile/old.ts', status: 'deleted' }); });
test('rejects a file blocking a directory', () => { expect(() => assembleTree([{ path: 'mobile', type: 'blob', mode: '100644', sha: 'x' }], incoming, 'mobile', false)).toThrow(); });
test.each(['main..bad', 'a/.hidden', 'a.lock', 'a//b', 'bad branch', '@', 'x.'])('rejects invalid branch %s', (branch: string) => { expect(validBranch(branch)).toBe(false); });
test('permits nested new branches', () => { expect(validBranch('repoforge/import-project')).toBe(true); });
