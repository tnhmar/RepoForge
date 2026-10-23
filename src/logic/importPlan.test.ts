import { describe, expect, test } from '@jest/globals';
import { planImport, safePath } from './importPlan';
const options = { stripRoot: true, destination: '', excludeSensitive: true };
describe('archive preview planning', () => {
  test.each(['../secret', '/etc/passwd', 'C:/file', 'a/../b', '.git/config', 'a//b', 'a\\b'])('rejects unsafe path %s', (path: string) => { expect(() => safePath(path)).toThrow(); });
  test('strips one enclosing folder and visibly excludes secrets', () => {
    const plan = planImport([{ path: 'project/src/App.tsx', bytes: 10 }, { path: 'project/.env', bytes: 2 }], options);
    expect(plan.files.map((f) => f.path)).toEqual(['src/App.tsx']);
    expect(plan.excluded).toEqual(['.env']);
  });
  test('keeps separate root files and supports a destination', () => {
    const plan = planImport([{ path: 'a.ts', bytes: 1 }, { path: 'src/b.ts', bytes: 2 }], { ...options, destination: 'mobile' });
    expect(plan.files.map((f) => f.path)).toEqual(['mobile/a.ts', 'mobile/src/b.ts']);
  });
  test('rejects collisions', () => {
    expect(() => planImport([{ path: 'a', bytes: 1 }, { path: 'a/b', bytes: 1 }], options)).toThrow();
    expect(() => planImport([{ path: 'A', bytes: 1 }, { path: 'a', bytes: 1 }], options)).toThrow();
  });
});
