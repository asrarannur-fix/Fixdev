# Visual Audit Report - BaruFix ERP SaaS

Tanggal: 19 Juli 2026

---

## 1. Sidebar & Navbar

### Sidebar (`Sidebar.tsx` - 851 baris)
- **Kondisi:** BAIK
- Ikon & label konsisten per modul via `getModuleColorClass()`
- Warna per modul: blue (services/overview), emerald (POS), amber (inventory), rose (accounting), sky (HR), purple (CRM), teal (settings), slate (fraud/mobile)
- Light/dark mode: konsisten `dark:bg-*` / `dark:text-*`
- Collapsible sidebar dengan hover expand di desktop (`lg:hover:w-52`)
- Search filter menu berfungsi

### Topbar (`Topbar.tsx` - 468 baris)
- **Kondisi:** BAIK
- Cloud status badge (emerald=ok, blue=checking, amber=offline)
- Tenant/branch switcher berfungsi
- Theme toggle (sun/moon)
- Settings dropdown dengan grid icon menu
- Profile dropdown dengan password change & logout
- Navigation mode switcher (sidebar/horizontal) - hidden di mobile

### HorizontalNavbar (`HorizontalNavbar.tsx` - 536 baris)
- **Kondisi:** BAIK
- Module pills dengan locked state (amber)
- Sub-tab strip dengan indigo active state
- Premium upgrade modal konsisten dengan sidebar version

### MobileBottomNav (`MobileBottomNav.tsx` - 136 baris)
- **Kondisi:** BAIK
- Fixed bottom, 6 tab + search
- `lg:hidden` - hanya muncul di mobile
- Safe area padding (`safe-area-pb`)

### BottomNav (`BottomNav.tsx` - 66 baris)
- **Kondisi:** BAIK
- Alternatif bottom nav (4 tab + menu)
- `pb-[env(safe-area-inset-bottom)]` untuk iPhone notch

---

## 2. Layout Receipt/Print
- **Kondisi:** TIDAK DIPERIKSA
- Perlu dicek manual dengan screenshot struk POS, slip servis, PO
- Tidak ada komponen print layout yang terlihat di file yang di-audit

---

## 3. Tema Dark/Light

### CSS Variables (`index.css` - 1047 baris)
- **Kondisi:** BAIK SEKALI
- Light mode: `--bg: #f1f5f9`, `--surface: #ffffff`, `--ink: #0f172a`
- Dark mode: `--bg: #09090b`, `--surface: #121214`, `--ink: #fafafa`
- Text contrast variables konsisten (950-400)
- Modal/dropdown variables terpisah
- Override global `.dark .text-slate-*` ke contrast variables
- Table styling di dark mode terintegrasi
- Input/select styling di dark mode terintegrasi

### Komponen Dark Mode
- **Kondisi:** BAIK
- Semua komponen punya `dark:` variants
- Scrollbar custom: light `#cbd5e1`, dark `var(--border)`
- Transition smooth 250ms di semua elemen

### Issue Potensial:
- PasswordChangeModal menggunakan `bg-slate-950` dan `bg-slate-900` - konsisten
- ConfirmDialog menggunakan `bg-slate-950/40` backdrop - konsisten
- Toast notification: 4 variant (success/error/warning/info) dengan dark mode

---

## 4. Responsif

### Mobile Grid (`index.css:954-979`)
- **Kondisi:** BAIK
- `@media (max-width: 640px)`: semua grid-cols-* → 1 kolom
- `@media (max-width: 768px)`: dynamic-subtab-selector padding reduced
- `@media (min-width: 641px) and (max-width: 1024px)`: grid-cols-4/5/6 → 2 kolom

### Table Responsif (`index.css:839-905`)
- **Kondisi:** BAIK
- `min-width: 600px` di mobile untuk prevent terlalu sempit
- `min-width: 100%` di desktop
- Sticky header
- Custom scrollbar untuk tabel

### Modal Overflow (`index.css:907-946`)
- **Kondisi:** BAIK
- `max-height: 90vh` untuk modal panel
- `overflow-y: auto` diaktifkan untuk modal
- Backdrop scrollable

### Grid Responsif
- `SharedUI.Grid`: `grid-cols-1 sm:grid-cols-2` (default 2 cols)
- `DataTable`: overflow-x-auto
- Sidebar: `-translate-x-full` di mobile, `lg:translate-x-0` di desktop

---

## 5. Empty States

### EmptyState (`EmptyState.tsx`)
- **Kondisi:** BAIK
- Icon + title + description + action pattern
- `py-12 px-4` padding
- Dark mode: `dark:text-zinc-600` icon, `dark:text-zinc-300` title

### SharedUI.EmptyState
- **Kondisi:** BAIK
- Dashed border style
- `p-10` padding
- Icon dalam container `bg-slate-100 dark:bg-zinc-800`

### DataTable Empty
- **Kondisi:** BAIK
- "Tidak ada data" text saat kosong
- Custom `emptyState` prop tersedia

### Sidebar Search Empty
- **Kondisi:** BAIK
- "Tidak ada hasil yang cocok" + "Coba kata kunci pencarian yang lain"

---

## 6. Modal & Drawer

### ConfirmDialog (`ConfirmDialog.tsx`)
- **Kondisi:** BAIK
- `motion/react` animation: `scale(0.95) → scale(1)`, `y: 20 → 0`
- Backdrop: `bg-slate-950/40 backdrop-blur-sm`
- 4 type variants: danger, warning, info, primary
- Portal ke `document.body`

### PasswordChangeModal (`PasswordChangeModal.tsx`)
- **Kondisi:** BAIK
- Portal-based
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Success/error states
- Loading spinner

### KeyboardShortcutsModal (`KeyboardShortcutsModal.tsx`)
- **Kondisi:** BAIK
- Portal-based
- Backdrop: `bg-slate-900/60 backdrop-blur-sm`
- `animate-fadeIn`

### Premium Upgrade Modal (di Sidebar & HorizontalNavbar)
- **Kondisi:** BAIK
- Portal-based
- Ambient glow effects
- Lock icon dengan `animate-pulse`
- `animate-fadeIn` animation

---

## 7. Warna Brand

### Role-based Colors (`RoleAvatar.tsx`)
- **Kondisi:** BAIK
- Super Admin: gradient indigo-slate-indigo + amber border
- Owner: gradient purple-fuchsia-pink
- Admin: gradient blue-cyan
- Manager: gradient orange-amber-yellow
- Kasir: gradient emerald-teal-green
- Teknisi: gradient sky-blue-slate

### Module Colors (Sidebar `getModuleColorClass`)
- **Kondisi:** BAIK
- Konsisten antara light/dark mode
- Blue: overview, services
- Emerald: POS, billing
- Amber: inventory, audits
- Rose: accounting
- Sky: HR
- Purple: CRM, tenants
- Teal: settings, supabase
- Slate: fraud, mobile-sim, default

---

## 8. Komponen UI Lainnya

### StatCard (`StatCard.tsx`)
- **Kondisi:** BAIK
- 5 accent variants (primary/success/warning/danger/info)
- Sparkline chart inline
- Delta indicator (trending up/down)

### Badge (`Badge.tsx`)
- **Kondisi:** BAIK
- 6 variants (primary/secondary/danger/success/warning/info)
- 2 sizes (sm/md)
- `font-mono` uppercase tracking

### Button (`Button.tsx`)
- **Kondisi:** BAIK
- 6 variants, 4 sizes
- `active:scale-95` feedback
- Disabled state: `opacity-50`

### Toast (`Toast.tsx`)
- **Kondisi:** BAIK
- `motion/react` animatePresence
- 4 types, auto-dismiss 4 detik
- Fixed bottom-right `z-[9999]`

### Skeleton (`Skeleton.tsx`)
- **Kondisi:** BAIK
- `animate-pulse` shimmer
- 3 variants: single block, text lines, card, rows

### ActionBar (`ActionBar.tsx`)
- **Kondisi:** BAIK
- Sticky bottom
- Backdrop blur
- `z-20`

---

## RINGKASAN ISSUE

### Tidak Ada Issue Kritis

### Issue Minor:
1. **PasswordChangeModal** - teks "Change Password", "Cancel", "Update Password" dalam bahasa Inggris, sedangkan seluruh app dalam bahasa Indonesia
2. **SharedUI.tsx** mendefinisikan ulang Card, Button, Badge, Input yang sudah ada di file komponen terpisah - **duplikasi komponen** yang bisa menyebabkan inkonsistensi styling
3. **BottomNav.tsx** dan **MobileBottomNav.tsx** keduanya menampilkan bottom nav untuk mobile dengan items berbeda - perlu dipastikan mana yang aktif
4. **Tidak ada print layout components** - receipt/print layout perlu dicek secara manual

### Score: 9/10
Kualitas visual sangat baik. Dark/light mode konsisten, responsif solid, komponen well-structured.
