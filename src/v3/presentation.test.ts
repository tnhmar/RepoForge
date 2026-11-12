import { expect, test } from '@jest/globals';
import { stageIndex, statusLabel, recentDestinations } from './presentation';
import type { Job } from '../liveStore';
test('unfinished records are not labelled as running uploads', () => { expect(statusLabel('started')).toBe('Needs checking'); expect(statusLabel('unknown')).toBe('Needs checking'); expect(statusLabel('completed')).toBe('Published'); });
test('preparation and tree stages precede verification and publication', () => { expect(stageIndex('tree')).toBe(0); expect(stageIndex('verify')).toBe(1); expect(stageIndex('publish')).toBe(3); });
test('recent destinations remain account-scoped and unique', () => { const jobs = [{ userId: 1, repository: 'owner/one' }, { userId: 2, repository: 'other/private' }, { userId: 1, repository: 'OWNER/ONE' }, { userId: 1, repository: 'owner/two' }] as Job[]; expect(recentDestinations(jobs, 1)).toEqual(['owner/one', 'owner/two']); });
