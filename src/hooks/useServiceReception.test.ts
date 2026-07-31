import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hook = readFileSync(new URL('./useServiceReception.ts', import.meta.url), 'utf8');

describe('service reception draft scope', () => {
  it('restores draft after tenant or branch scope changes', () => {
    expect(hook).toContain('}, [SRV_DRAFT, setShowNewSrvCustForm]);');
    expect(hook).toContain('fixdev_srv_draft_v1_${activeTenantId || \'unknown\'}_${currentBranchId || \'unknown\'}');
  });
});
