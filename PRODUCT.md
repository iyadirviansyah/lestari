# LESTARI — Product spec

Portal klien untuk pemilik usaha (café/restoran kecil) yang berlangganan perawatan tanaman LESTARI.
Sumber kebenaran untuk apa yang dibangun. Desain visual ada di [DESIGN.md](DESIGN.md).

## Pengguna

- **Sarah Anindya**, pengelola Café Senja, Tangerang. Waktu terbatas, tidak mau mengurus tanaman sendiri.
- Tidak peduli skor atau persen. Peduli: kapan tim datang, ada yang rusak, apa yang harus diputuskan, berapa biaya.

## Jobs to be done

1. Tahu kapan tim datang dan apa yang dikerjakan.
2. Punya bukti kerja (foto sebelum/sesudah, catatan) yang bisa dibagikan.
3. Memutuskan biaya tambahan tanpa telepon: lihat masalah, foto, harga, lalu setuju atau tolak.
4. Membayar tagihan dan memperpanjang paket tanpa keluar dari app.
5. Melaporkan masalah tanaman dengan foto dan mendapat balasan.

## Aturan produk

- Tanpa skor persen atau "health score". Status tanaman pakai tiga kata: Sehat, Perlu perhatian, Dalam perawatan.
- Semua alur selesai di dalam app. Tidak ada tautan keluar ke WhatsApp.
- Tidak ada biaya tanpa persetujuan. Persetujuan yang disetujui otomatis membuat tagihan.
- Beranda hanya menampilkan yang butuh tindakan dulu, lalu jadwal, lalu kondisi tanaman.

## Struktur (5 tab)

| Tab | Isi |
| --- | --- |
| Beranda | Perlu tindakan (persetujuan, tagihan jatuh tempo) · kunjungan berikutnya · tanaman perlu perhatian · aksi cepat |
| Tanaman | Daftar + filter status + cari · detail: riwayat, perawatan berikutnya, lapor masalah |
| Kunjungan | Mendatang / Selesai · detail kunjungan (agenda atau laporan, ajukan ubah jadwal, bagikan PDF) |
| Pesan | Thread per topik, kirim teks dan foto, balasan tim |
| Akun | Profil, Paket & Tagihan, Riwayat persetujuan, Notifikasi, Bantuan |

Layar lain: Masuk, Pengenalan (3 layar, sekali), Persetujuan biaya, Lapor masalah, Bayar, Perpanjang paket.

## Alur utama

- **Persetujuan:** Beranda → Persetujuan → Setujui → tagihan dibuat + pesan konfirmasi di thread → muncul di Tagihan.
- **Lapor masalah:** Tanaman/Beranda → pilih tanaman, jenis, catatan, foto → kirim → thread baru + status tanaman jadi Perlu perhatian → balasan tim.
- **Bayar:** Tagihan → pilih metode (QRIS, transfer VA) → instruksi → konfirmasi → lunas + bukti.
- **Perpanjang:** Tagihan → pilih 1/3/6 bulan → tagihan dibuat → bayar → masa aktif bertambah.
- **Ubah jadwal:** Detail kunjungan mendatang → pilih tanggal usulan → kirim → thread + status "Menunggu konfirmasi".

## Data (Care Basic)

- Harga: Rp900.000/bulan, 2 kunjungan/bulan. Tanggal acuan hari ini: Sabtu, 7 November 2026.
- 4 tanaman, 4 area: Teras Depan, Area Bar, Area Indoor, Sudut Kasir.

## State wajib tiap layar

Kosong, memuat (tombol disabled saat kirim/bayar), berhasil (toast), gagal tidak ada di prototype.
Teks panjang terpotong dengan elipsis, tidak melebarkan layout.

## Copy

Bahasa Indonesia, "Anda", sentence case, tanpa tanda seru, tanpa kata hype, tanpa huruf besar berjarak lebar.

## Batas prototype

Data ada di localStorage browser. Tidak ada backend, pembayaran nyata, atau notifikasi push.

## Skalabilitas (model data)

- **Akun → banyak Lokasi.** Tanaman, kunjungan, persetujuan, paket, tagihan, dan pesan melekat ke Lokasi. Pelanggan memilih satu lokasi atau "Semua lokasi" lewat pill di header. Satu akun bisa punya café dan kantor.
- **Daftar konstanta menggerakkan UI** (`src/data.ts`): `LOCATION_TYPES`, `PLANT_STATUS`, `SERVICE_TYPES`, `PLAN_CATALOG`. Tambah jenis lokasi, status, layanan, atau paket baru di sana.
- **Banyak persetujuan** per lokasi (`/approval/:id`), bukan satu bendera. Layanan baru = jenis kunjungan baru + penawaran biaya.
- **Aturan menambah fitur:** data baru harus punya `locationId`; layar baru memakai `inScope()` dari store; tidak ada string lokasi yang ditulis langsung di layar.

## Demo (tanpa backend)

- Login Google tiruan. Dua skenario di layar login: **Akun baru** (kosong) dan **Sudah berjalan** (terisi, 2 lokasi, 3 klien lain untuk admin).
- Data di `localStorage` (`lestari-db-v1`), tersinkron antar jendela lewat event `storage`. Tombol "Atur ulang data demo" ada di Akun dan di admin.
- **Dashboard admin** di `#/admin` (tanpa login): ringkasan, antrean, klien (tanaman, kunjungan, penawaran, tagihan), pesan.
- **Alur kosong → terisi:** pelanggan daftarkan lokasi (audit + tagihan Green Audit) → admin konfirmasi jadwal → admin selesaikan audit, catat tanaman, aktifkan paket → pelanggan melihat semuanya terisi.

## Alur manual → app (heuristik)

Layanan ini sudah ada tanpa teknologi: survei lokasi → proposal tertulis → pemasangan → kunjungan rutin berjadwal → catatan/laporan kunjungan → penggantian tanaman bila menurun → penagihan dan perpanjangan. App hanya memindahkan tiap langkah ke layar, bukan menambah langkah.

| Langkah manual | Pelanggan (app) | Admin (dashboard) |
| --- | --- | --- |
| Calon klien menghubungi | Masuk Google, lengkapi profil, daftarkan lokasi (alamat bertahap, jadwal audit dari kalender) | Tahap "Baru mendaftar" / "Audit diajukan" di Klien |
| Survei lokasi | Kunjungan "Audit lokasi" | Konfirmasi jadwal, selesaikan audit, catat tanaman |
| Proposal dan harga | Tagihan Green Audit, paket Care Basic | Aktifkan paket (tahap "Siap aktivasi") |
| Kunjungan rutin | Kunjungan mendatang, ubah jadwal, ajukan kunjungan | Jadwal per tanggal, konfirmasi, selesaikan dengan catatan |
| Laporan kunjungan | Laporan, foto, kondisi, bagikan | Catatan petugas, centang pekerjaan |
| Penggantian tanaman | Persetujuan biaya | Penawaran biaya per tanaman |
| Tagihan dan perpanjangan | Bayar, bukti, perpanjang | Buat tagihan, tandai lunas, pengingat paket berakhir |

Aturan alur: tidak ada nilai bawaan yang menyesatkan (nama, jenis lokasi, jumlah tanaman, tanaman yang dilapor, jenis masalah, metode bayar, lama perpanjangan harus dipilih pengguna). Akun baru wajib mengisi nama sebelum masuk app. Setiap layar kosong punya satu CTA yang menjelaskan langkah berikutnya.

## Mode tamu dan gerbang login

- Layar masuk punya **Lanjutkan dengan Google** dan **Lewati dulu**. Tamu masuk ke app dalam kondisi kosong dan bebas menjelajah semua tab.
- Tamu bisa melihat: Beranda (ajakan mendaftar), **Paket dan harga**, **Cara kerja**, layar kosong tiap tab. Tab Pesan dan Akun menampilkan ajakan masuk.
- **Login diminta saat komitmen**: daftarkan lokasi, tambah tanaman, lapor masalah, kirim pesan, bayar, perpanjang, ubah profil. Daftar layar komitmen ada di `PROTECTED` (`src/router.ts`); gerbangnya satu tempat (`go`/`swap`), jadi layar baru cukup didaftarkan di sana.
- Setelah login pengguna **kembali ke tujuan semula** (`returnTo`). Akun yang belum punya nama melewati langkah "Lengkapi profil" dulu, lalu lanjut ke tujuan.
- Layar masuk dari gerbang menjelaskan alasannya ("Masuk untuk mendaftarkan lokasi") dan menyembunyikan pilihan demo.
