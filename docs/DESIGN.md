# LESTARI — Design system

Arah dibuat dengan skill `unslop`, `emil-design-eng`, `mobile-native`, `break-ui` (lihat `.claude/skills/`).
unslop berlisensi CC BY 4.0 (Damir Sokolovsky); skill Emil berlisensi MIT.

## Arah

- **Produk:** portal klien perawatan tanaman untuk pemilik café kecil.
- **Karakter:** tenang, tepat, hangat-praktis.
- **Dunia:** daun, tanah, kain linen, cahaya jendela.
- **Momen kaya:** foto tanaman dan foto sebelum/sesudah. Chrome tetap sunyi.
- **Signature:** titik status 8px di sebelah label status (Sehat, Perlu perhatian, Dalam perawatan). Dipakai di mana pun status muncul.

## Token

Warna (netral ditint hijau, saturasi sangat rendah):

| Peran | Nilai |
| --- | --- |
| Latar | `#f4f6f1` |
| Kartu | `#ffffff` |
| Permukaan terangkat | `#eceee8` |
| Garis (divider/border) | `rgba(31,52,40,.10)` — tint hijau, bukan abu netral |
| Teks utama / kedua / redup | `#1b2620` / `#4f5b53` / `#6d776f` |
| Aksen (satu-satunya) | `#2f5d44`, teks di atasnya putih |
| Peringatan | teks `#8f5a14`, latar `#f5e9d3` |
| Bahaya | teks `#a63d2b`, latar `#f6e3de` |

Jarak: grid 4px. Skala 4, 8, 12, 16, 20, 24, 32, 40. Gutter halaman 20. Padding kartu 16, baris-gambar 12.
Radius: kartu 20, kontrol 12, thumbnail 8 (radius dalam = luar − padding). Thumbnail 64×64, padding baris 12 ke semua sisi.

Tipografi: Plus Jakarta Sans, bobot 400 dan 500 (600 sangat jarang). Hierarki lewat ukuran dan warna.
Skala: 28 / 22 / 17 / 15 / 13 / 12 (+ 11 untuk label tab). Sentence case. Angka `tabular-nums`.

Ikon: lucide, 18px, stroke 1.5, warna mengikuti peran teks.

## Komponen

- Kartu baris (thumbnail + teks), daftar berkelompok dengan divider inset, chip filter, segmented, tombol (utama aksen, sekunder terangkat), input 48px dengan font 16px, sheet bawah, toast, bubble chat.
- Satu tombol utama per layar.

## Interaksi (Emil + mobile-native)

- Tekan: `scale(.97)`, 120ms, `ease-out`. Hover hanya di `@media (hover: hover)`.
- Transisi hanya properti yang disebut (`color, background-color, border-color, opacity, transform`). Tidak ada `transition: all`.
- Masuk layar: fade + naik 8px, 220ms. Sheet: naik dari bawah 240ms. Hormati `prefers-reduced-motion`.
- `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`, tap target ≥ 44px, input 16px (tanpa zoom iOS), `100dvh`, safe-area di tab bar.
- Gerak hanya untuk menjelaskan; tidak ada animasi berulang.

## Dilarang

Gradien warna, glow, uppercase berjarak lebar, emoji sebagai ikon, bobot ≥ 700, angka persen sebagai metrik, label "dummy".

## Bottom sheet

- Dirender di `document.body` (menutupi tab bar), menempel di dasar layar, maksimal 90dvh dan bisa di-scroll di dalam.
- Tutup lewat area luar, Escape, atau tombol; selalu dengan animasi turun 200ms (fade scrim + geser). Animasi keluar memakai tiruan visual saat komponen dilepas.
- Dipakai untuk: pilih lokasi, kalender jadwal, konfirmasi. Form panjang tetap halaman penuh.
- Kalender: Senin–Sabtu, mulai besok, 90 hari ke depan, lalu pilih jam. Alamat: akordion kota → kecamatan → kode pos → jalan.
