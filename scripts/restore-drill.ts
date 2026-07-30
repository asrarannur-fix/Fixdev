import path from 'node:path';
import { verifyBackupArtifact } from '../src/server/lib/restoreDrill.js';

const artifactPath = process.argv[2];
if (!artifactPath) throw new Error('Usage: npm run backup:restore-drill -- <artifact.json>');

const result = await verifyBackupArtifact(path.resolve(artifactPath), path.resolve('migrations'));
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.valid) process.exitCode = 1;
