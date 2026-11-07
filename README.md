# LESTARI

Portal pelanggan perawatan tanaman untuk pemilik café dan restoran (Tangerang). Prototipe untuk tugas Kewirausahaan Mandiri: aplikasi berbentuk HP untuk pelanggan, plus dashboard admin. Tidak ada database sungguhan; data demo disimpan di `localStorage`.

Demo: https://lestari-ochre.vercel.app

## Menjalankan

```bash
pnpm install   # atau: npm install
pnpm dev       # atau: npm run dev
```

Buka http://localhost:8443 (atau port yang tampil di terminal).

- Aplikasi pelanggan: `/#/`
- Dashboard admin: `/#/admin`
- Data demo bisa diatur ulang dari menu Akun (pelanggan) atau sidebar (admin).
- Dua skenario data: **baru** (akun kosong) dan **jalan** (2 lokasi, data lengkap).

Build produksi: `pnpm build` (hasil di `dist/`).

## Struktur

```
src/
  lib/         data, state (store), router
  components/  komponen bersama (Sheet, SelectField, SlotPicker, alamat)
  customer/    layar dan alur pelanggan
  admin/       dashboard admin
  App.tsx      rute dan tab bar
  index.css    token dan gaya
docs/          PRODUCT.md, DESIGN.md, CREDITS.md
public/        foto tanaman, ikon, manifest
```

Impor memakai alias `@/` (= `src/`).

## Sebelum mengubah UI

Baca [PRODUCT.md](docs/PRODUCT.md) (apa yang dibangun) dan [DESIGN.md](docs/DESIGN.md) (token, tipografi, interaksi). Skill desain ada di `.claude/skills/`. Kredit foto di [CREDITS.md](docs/CREDITS.md).

## Catatan

- Login Google hanya tiruan; admin belum punya login.
- Data hanya ada di browser masing-masing, jadi sinkron admin dan pelanggan hanya berlaku di browser yang sama.
- Belum diuji di HP asli.
