import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/utils/print.ts', 'utf8');
const job = readFileSync('src/utils/printJob.ts', 'utf8');
const controller = readFileSync('src/server/controllers/printJob.controller.ts', 'utf8');
const migration = readFileSync('migrations/060_print_jobs.sql', 'utf8');

test('profil cetak memakai urutan tenant, dokumen, cabang, dokumen cabang', () => {
  assert.match(print, /\.\.\.config, \.\.\.globalDocumentConfig, \.\.\.branchConfig, \.\.\.branchDocumentConfig/);
});

test('job cetak hanya mengirim hash, idempotensi, dan hasil terstruktur', () => {
  assert.match(job, /crypto\.subtle\.digest\('SHA-256'/);
  assert.doesNotMatch(job, /content: html/);
  assert.match(controller, /idempotencyKey/);
  assert.match(controller, /branch_id=\$6/);
  assert.match(migration, /uq_print_jobs_tenant_idempotency/);
});

test('cetak ulang dibatasi alasan dan job QZ diantrekan', () => {
  assert.match(controller, /reprintReason/);
  assert.match(controller, /reprint_sequence/);
  assert.match(job, /queuePrinter/);
  assert.match(job, /withTimeout/);
  assert.match(job, /SALINAN \/ REPRINT/);
});
