# Perbaikan Visual & UX - 22 Juli 2026

## Ringkasan Perubahan
Audit dan perbaikan pada area Frontend/Visual/UX sesuai instruksi Agent Audit.

### Modul POS
- **Typo/Visual:** Ukuran font label kategori dan stok pada kartu produk ditingkatkan dari `text-[8px]` menjadi `text-[9px]` untuk keterbacaan yang lebih baik di layar kecil.
- **Workflow:** Menambahkan properti `autoFocus` pada input barcode scanner agar kasir bisa langsung memindai barang tanpa klik manual ke input field.
- **Visual:** Meningkatkan kontras warna font pada rincian item keranjang (`text-slate-400` -> `text-slate-500`) dan ukuran font (`text-[10px]` -> `text-[11px]`).

### Modul Inventory
- **UX:** Mengubah logika render `InventoryTab` agar sub-panel (Stock & Transfer) hanya muncul sesuai tab aktif, mengurangi panjang halaman (vertical scroll) yang berlebihan.
- **Visual:** Memperbaiki mapping sub-tab `stock`, `products`, dan default state agar konsisten dengan navigasi menu.

### Perpajakan
- **Konfigurasi:** Memastikan komponen menggunakan nilai `taxRate` dari konfigurasi tenant (dynamic) dan bukan hardcoded 11% jika tersedia di context (sudah sesuai pola `ModuleParameterConfig`).

## File Terkait
- `src/components/tenant/POSTab.tsx`
- `src/components/tenant/InventoryTab.tsx`
- `src/components/ModuleParameterConfig.tsx` (verified dynamic)

## Verifikasi
- `npm run lint`: PASS
- `git diff --check`: PASS
