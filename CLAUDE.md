# LESTARI

Portal pelanggan perawatan tanaman (prototipe). React 19, Vite, TypeScript, lucide-react. Tailwind v4 hanya dipakai untuk reset; gaya ditulis tangan di `src/index.css` dengan token.

Baca [docs/PRODUCT.md](docs/PRODUCT.md) (apa yang dibangun) dan [docs/DESIGN.md](docs/DESIGN.md) (token, tipografi, interaksi) sebelum mengubah UI. Skill desain ada di `.claude/skills/`.

## Struktur

- `src/lib/`: `data.ts` (tipe, data awal, format), `store.tsx` (state, aksi, localStorage), `router.ts` (router hash, login)
- `src/components/`: `ui.tsx` (Sheet, SelectField, SlotPicker, dst.), `address.tsx`
- `src/customer/`: `screens.tsx` dan `flows.tsx` (layar pelanggan)
- `src/admin/Admin.tsx`: dashboard admin
- `src/App.tsx`: rute dan tab bar; `src/index.css`: token dan gaya
- Impor memakai alias `@/` (= `src/`).

Dev server berjalan di port 8443 (`pnpm dev`). Tidak ada database; data demo di `localStorage` (`lestari-db-v1`).
