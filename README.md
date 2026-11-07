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

| File | Isi |
| --- | --- |
| `src/data.ts` | tipe, konstanta, data awal, format |
| `src/store.tsx` | state dan aksi (simpan ke localStorage) |
| `src/router.ts` | router hash, login tamu/pengguna |
| `src/ui.tsx` | komponen kecil (Sheet, SelectField, SlotPicker, dst.) |
| `src/screens.tsx`, `src/flows.tsx` | layar pelanggan |
| `src/admin.tsx` | dashboard admin |
| `src/App.tsx` | rute dan tab bar |
| `src/index.css` | token dan gaya |

## Sebelum mengubah UI

Baca [PRODUCT.md](PRODUCT.md) (apa yang dibangun) dan [DESIGN.md](DESIGN.md) (token, tipografi, interaksi). Skill desain ada di `.claude/skills/`. Kredit foto di [CREDITS.md](CREDITS.md).

## Catatan

- Login Google hanya tiruan; admin belum punya login.
- Data hanya ada di browser masing-masing, jadi sinkron admin dan pelanggan hanya berlaku di browser yang sama.
- Belum diuji di HP asli.
