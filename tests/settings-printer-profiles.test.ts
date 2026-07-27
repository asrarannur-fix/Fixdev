import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsTab = readFileSync('src/components/tenant/SettingsTab.tsx', 'utf8');
const printerTerms = readFileSync('src/components/tenant/SettingsPrinterTerms.tsx', 'utf8');

test('UI profil printer menampilkan semua kontrol operasional', () => {
  assert.match(printerTerms, /Jenis Dokumen Profil/);
  for (const type of ['default', 'pos_receipt', 'service_receipt', 'service_invoice', 'service_label', 'warranty', 'rental', 'inventory', 'report']) assert.match(printerTerms, new RegExp(type));
  for (const label of ['Mode', 'Nama Printer', 'Kertas', 'Margin mm', 'Lebar mm', 'Tinggi mm', 'Orientasi', 'Densitas', 'Salinan', 'Feed', 'Potong Kertas', 'Cetak Ulang', 'Batas Salinan Ulang']) assert.match(printerTerms, new RegExp(label));
});

test('snapshot profil disimpan pada cabang dan jenis dokumen aktif', () => {
  assert.match(settingsTab, /branches:\s*\{[\s\S]*\[currentBranchId\]:\s*\{[\s\S]*documentProfiles:\s*\{[\s\S]*\[profileDocumentType\]:/);
  assert.match(settingsTab, /profileSnapshot/);
  assert.match(printerTerms, /resolvePrintConfig\([\s\S]*currentBranchId,[\s\S]*profileDocumentType/);
});
