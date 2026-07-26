# POS Pricing, Promo, Bundle Minimum

- Tambah migration additive `057_pos_pricing_promotions_bundles.sql` setelah migration `056`.
- Harga server-authoritative memakai price list tenant/cabang/customer dengan masa berlaku.
- Promosi fixed/percent mendukung minimum pembelian, masa berlaku, batas diskon, dan non-stack default; voucher lama tetap berjalan.
- Bundle checkout membaca komponen dari server, mengurangi stok komponen, dan menyimpan snapshot komposisi pada item transaksi.
- Void dan partial refund membaca snapshot bundle lalu mengembalikan stok komponen.
- Endpoint POS baru: `GET /bundles` dan `GET /promotions`.
- File terkait: `src/services/posService.ts`, `src/server/controllers/pos.controller.ts`, `src/server/routes/pos.routes.ts`, `tests/pos.api.test.ts`.
