import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const print = readFileSync('src/utils/print.ts', 'utf8');
const job = readFileSync('src/utils/printJob.ts', 'utf8');
const controller = readFileSync('src/server/controllers/printJob.controller.ts', 'utf8');
const migration = readFileSync('migrations/060_print_jobs.sql', 'utf8');

test('profil cetak memakai urutan tenant, dokumen, cabang, dokumen cabang', () => {
  for (const layer of ['...config', '...globalDocumentConfig', '...branchConfig', '...branchDocumentConfig']) {
    assert.match(print, new RegExp(layer.replaceAll('.', '\\.')));
  }
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
  assert.match(job, /reprintPolicy === 'deny'/);
  assert.match(job, /queuePrinter/);
  assert.match(job, /withTimeout/);
  assert.match(job, /SALINAN \/ REPRINT/);
});

test('fallback QZ menyelesaikan job sekali dengan hasil browser atau error gabungan', () => {
  assert.match(job, /if \(fallbackResult\.ok\) \{\s*return finish\(\{ \.\.\.fallbackResult, transport: 'browser' \}\);/);
  assert.match(job, /Fallback browser gagal:/);
  assert.doesNotMatch(job, /void finish\(\{ \.\.\.fallbackResult/);
});

test('riwayat print memakai pagination tervalidasi tanpa menghapus audit global', () => {
  const migration = readFileSync('migrations/061_print_jobs_index_cleanup.sql', 'utf8');
  assert.match(controller, /offset: z\.coerce\.number\(\)\.int\(\)\.min\(0\)\.max\(10_000\)/);
  assert.match(controller, /SELECT COUNT\(\*\)::int AS total/);
  assert.doesNotMatch(migration, /DELETE FROM print_jobs/);
  assert.match(migration, /tenant_id, branch_id, created_at DESC/);
});
