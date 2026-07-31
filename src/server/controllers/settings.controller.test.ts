import { describe, expect, it } from 'vitest';
import { 
  mergeSettingsSecrets 
} from './settings.controller';

describe('Settings domain persistence', () => {
  it('merges settings and preserves secrets when incoming values are empty or masked', () => {
    const existing = { apiToken: 'secret-123', templateCode: 'hello' };
    const incomingMasked = { apiToken: '********', templateCode: 'world' };
    
    const mergedMasked = mergeSettingsSecrets('waConfig', existing, incomingMasked);
    expect(mergedMasked).toEqual({ apiToken: 'secret-123', templateCode: 'world' });

    const incomingEmpty = { apiToken: '   ', templateCode: 'hi' };
    const mergedEmpty = mergeSettingsSecrets('waConfig', existing, incomingEmpty);
    expect(mergedEmpty).toEqual({ apiToken: 'secret-123', templateCode: 'hi' });
  });

  it('drops secrets if they were absent and incoming is blank or masked', () => {
    const existing = { templateCode: 'hello' };
    const incomingMasked = { apiToken: '********', templateCode: 'world' };
    
    const mergedMasked = mergeSettingsSecrets('waConfig', existing, incomingMasked);
    expect(mergedMasked).toEqual({ templateCode: 'world' });
  });

  it('updates secrets when a real value is provided', () => {
    const existing = { apiToken: 'secret-123', templateCode: 'hello' };
    const incoming = { apiToken: 'new-secret', templateCode: 'world' };
    
    const merged = mergeSettingsSecrets('waConfig', existing, incoming);
    expect(merged).toEqual({ apiToken: 'new-secret', templateCode: 'world' });
  });
});
