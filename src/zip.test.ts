import { describe, expect, test } from '@jest/globals';
import { strToU8, zipSync } from 'fflate';
import { readZip, crc32 } from './zip';
describe('bounded ZIP reader', () => {
  test('reads file bytes and nested paths without storing the archive in Git', async () => {
    const binary = new Uint8Array([0, 255, 1, 128]);
    const files = await readZip(zipSync({ 'project/README.md': strToU8('Hello'), 'project/assets/a.bin': binary }));
    expect(files.map((f) => f.path)).toEqual(['project/README.md', 'project/assets/a.bin']);
    expect(files[1].data).toEqual(binary);
  });
  test('rejects traversal, Git metadata and collisions', async () => {
    await expect(readZip(zipSync({ '../outside': strToU8('x') }))).rejects.toThrow();
    await expect(readZip(zipSync({ '.git/config': strToU8('x') }))).rejects.toThrow();
    await expect(readZip(zipSync({ A: strToU8('x'), a: strToU8('y') }))).rejects.toThrow();
    await expect(readZip(zipSync({ a: strToU8('x'), 'a/b': strToU8('y') }))).rejects.toThrow();
  });
  test('rejects highly expanding and truncated archives', async () => {
    await expect(readZip(zipSync({ bomb: new Uint8Array(1024 * 1024) }))).rejects.toThrow();
    const bytes = zipSync({ a: strToU8('hello') });
    await expect(readZip(bytes.subarray(0, bytes.length - 1))).rejects.toThrow();
  });
  test('CRC implementation matches the standard vector', () => { expect(crc32(strToU8('123456789'))).toBe(0xCBF43926); });
});
