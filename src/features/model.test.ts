import { expect, test } from '@jest/globals';
import { csv, diffLines, dispatchInputs, validRepository } from './model';
test('maps new and old diff line numbers', () => { expect(diffLines('@@ -4,2 +4,2 @@\n-old\n+new\n same')).toEqual([{ line: 4, side: 'LEFT', text: '-old' }, { line: 4, side: 'RIGHT', text: '+new' }, { line: 5, side: 'RIGHT', text: ' same' }]); });
test('validates repository identifiers', () => { expect(validRepository('tnhmar/RepoForge')).toBe(true); expect(validRepository('https://evil.test/x')).toBe(false); expect(validRepository('a/..')).toBe(false); });
test('deduplicates metadata entries', () => { expect(csv('bug, ui,bug,')).toEqual(['bug', 'ui']); });
test('validates workflow inputs', () => { expect(dispatchInputs('{"flag":true}')).toEqual({ flag: true }); expect(() => dispatchInputs('[]')).toThrow(); expect(() => dispatchInputs('{"nested":{}}')).toThrow(); });
