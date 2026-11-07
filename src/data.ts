/* Model data LESTARI.
 * Skalabel: Akun punya banyak Lokasi; Tanaman, Kunjungan, Persetujuan, Paket melekat ke Lokasi.
 * Jenis lokasi, jenis layanan, dan paket adalah daftar konstanta: tambah baris, UI ikut. */

export const LOCATION_TYPES = ["Café", "Restoran", "Kantor", "Rumah", "Lainnya"] as const;
export const PLANT_STATUS = ["Sehat", "Perlu perhatian", "Dalam perawatan", "Belum dicek"] as const;
export const SERVICE_TYPES = ["Audit lokasi", "Perawatan rutin", "Penggantian tanaman"] as const;
export const PLAN_CATALOG = [
  { id: "basic", name: "Care Basic", price: 900_000, visits: 2, note: "2 kunjungan per bulan, laporan foto" },
] as const;
export const AUDIT_PRICE = 250_000;

export type LocationType = (typeof LOCATION_TYPES)[number];
export type PlantStatus = (typeof PLANT_STATUS)[number];
export type VisitStatus = "Menunggu konfirmasi" | "Terjadwal" | "Selesai";

export type Account = { id: string; name: string; email: string; phone?: string };
export type Location = { id: string; accountId: string; name: string; type: LocationType; address: string; city?: string; district?: string; postal?: string; note?: string };
export type Plant = {
  id: string;
  locationId: string;
  name: string;
  species?: string;
  area: string;
  status: PlantStatus;
  lastCare?: string;
  nextCare?: string;
  image?: string;
  history: { date: string; title: string; text: string; by: string }[];
};
export type Report = { id: string; sehat: number; perhatian: number; rawat: number; acts: string[]; note: string };
export type Visit = {
  id: string;
  locationId: string;
  date: string; // ISO yyyy-mm-dd
  time: string;
  type: (typeof SERVICE_TYPES)[number];
  staff: string;
  status: VisitStatus;
  agenda: string[];
  resched?: string;
  report?: Report;
};
export type Approval = {
  id: string;
  locationId: string;
  plantId?: string;
  title: string;
  reason: string;
  amount: number;
  status: "Menunggu keputusan" | "Disetujui" | "Ditolak";
  createdAt: string;
  threadId: string;
};
export type Invoice = {
  id: string;
  locationId?: string;
  title: string;
  amount: number;
  due: string;
  status: "Belum dibayar" | "Lunas";
  months?: number;
  paidAt?: string;
  method?: string;
};
export type Plan = { locationId: string; planId: string; status: "Aktif" | "Menunggu audit"; until?: string };
export type Msg = { id: string; from: "me" | "team"; text?: string; img?: string; at: string };
export type Thread = {
  id: string;
  locationId?: string;
  title: string;
  sub: string;
  unread: number; // belum dibaca pelanggan
  adminUnread: number; // belum dibaca admin
  acked?: boolean;
  msgs: Msg[];
};
export type DB = {
  scenario: "baru" | "jalan";
  me: string;
  scope: string; // "all" atau id lokasi
  accounts: Account[];
  locations: Location[];
  plants: Plant[];
  visits: Visit[];
  approvals: Approval[];
  invoices: Invoice[];
  plans: Plan[];
  threads: Thread[];
};

export const TODAY = new Date(2026, 10, 7); // Sabtu, 7 November 2026
export const idr = (n: number) => "Rp" + n.toLocaleString("id-ID");
export const day = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d); // lokal, bebas geser zona waktu
};
export const fmt = (iso: string | Date, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("id-ID", o).format(typeof iso === "string" ? day(iso) : iso);
export const time = () =>
  new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
export const uid = () => Math.random().toString(36).slice(2, 9);
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const planOf = (id: string) => PLAN_CATALOG.find((p) => p.id === id) ?? PLAN_CATALOG[0];

/** Tambah pesan ke thread (murni terhadap db yang sedang dimutasi). */
export function pushMsg(db: DB, threadId: string, msg: Omit<Msg, "id" | "at">, who: "me" | "team") {
  const t = db.threads.find((x) => x.id === threadId);
  if (!t) return;
  t.msgs.push({ ...msg, id: uid(), at: time() });
  if (who === "team") t.unread += 1;
  else t.adminUnread += 1;
}

/* ---------------- Seed ---------------- */

const acts = ["Penyiraman", "Pembersihan daun", "Pemangkasan daun kering", "Pemberian nutrisi organik"];
const agenda = ["Pengecekan kondisi tanaman", "Penyiraman dan pemberian nutrisi", "Pembersihan daun dan area pot", "Foto sebelum dan sesudah"];
const ME: Account = { id: "u-sarah", name: "Sarah Anindya", email: "sarah.anindya@gmail.com", phone: "+62 812 8900 1122" };
const ME_NEW: Account = { id: "u-sarah", name: "", email: "pengguna.baru@gmail.com" }; // akun Google baru: nama diisi saat pengaturan awal

const plant = (id: string, locationId: string, name: string, area: string, status: PlantStatus, image?: string, species?: string): Plant => ({
  id,
  locationId,
  name,
  species,
  area,
  status,
  image,
  lastCare: "31 Okt",
  nextCare: "14 Nov",
  history: [],
});

/* ---- Klien lain (untuk dashboard admin): dibangkitkan dari daftar ringkas ---- */
type Plantish = [string, string, PlantStatus];
type Other = {
  acc: [string, string, string]; // id, nama, email
  loc?: [string, string, LocationType, string, string]; // id, nama lokasi, jenis, alamat jalan, kecamatan
  start?: number; // bulan mulai langganan (0 = Januari 2026); kosong = belum aktif
  until?: string;
  plants?: Plantish[];
};
const OTHERS: Other[] = [
  { acc: ["u-melati", "Haryanto Kusuma", "haryanto@penginapanmelati.id"], loc: ["l-melati", "Penginapan Melati", "Lainnya", "Jl. Daan Mogot No. 112", "Batuceper"], start: 0, until: "2026-12-15", plants: [["Monstera", "Lobi", "Sehat"], ["Sansevieria", "Koridor", "Sehat"], ["Palem kuning", "Resepsi", "Sehat"], ["Philodendron", "Kamar 3", "Perlu perhatian"]] },
  { acc: ["u-pinang", "Maya Putri", "maya@teraspinang.id"], loc: ["l-pinang", "Kafe Teras Pinang", "Café", "Jl. Pinang Raya No. 33", "Pinang"], start: 1, until: "2026-12-31", plants: [["Karet kebo", "Teras", "Sehat"], ["Zamioculcas", "Kasir", "Sehat"], ["Pothos", "Rak dinding", "Dalam perawatan"]] },
  { acc: ["u-bakmi", "Rudi Hartono", "rudi@bakmisahabat.id"], loc: ["l-bakmi", "Bakmi Sahabat", "Restoran", "Jl. KH Hasyim Ashari No. 9", "Cipondoh"], start: 2, until: "2027-01-31", plants: [["Monstera", "Dekat kasir", "Perlu perhatian"], ["Lidah mertua", "Pintu masuk", "Sehat"]] },
  { acc: ["u-notaris", "Andi Wibowo", "andi@notariswibowo.id"], loc: ["l-notaris", "Kantor Notaris Wibowo", "Kantor", "Jl. Jenderal Sudirman No. 40", "Tangerang"], start: 4, until: "2027-02-28", plants: [["Sansevieria", "Ruang tunggu", "Sehat"], ["Palem areca", "Ruang kerja", "Sehat"], ["Aglaonema", "Meja resepsi", "Sehat"]] },
  { acc: ["u-benda", "Joko Susilo", "joko@warkopbenda.id"], loc: ["l-benda", "Warung Kopi Benda", "Café", "Jl. Raya Benda No. 18", "Benda"], start: 5, until: "2027-01-31", plants: [["Kuping gajah", "Teras", "Sehat"], ["Monstera", "Area duduk", "Sehat"]] },
  { acc: ["u-dimas", "Dimas Prakoso", "dimas@kopikenari.id"], loc: ["l-kenari", "Kopi Kenari", "Café", "Jl. Ki Hajar Dewantara No. 7", "Tangerang"], start: 7, until: "2027-01-31", plants: [["Monstera", "Area duduk", "Sehat"], ["Sansevieria", "Kasir", "Sehat"], ["Pothos", "Rak dinding", "Perlu perhatian"]] },
  { acc: ["u-lia", "Lia Maharani", "lia.maharani@gmail.com"], loc: ["l-lia", "Rumah Lia", "Rumah", "Cluster Alam Sutera Blok C5", "Karawaci"], start: 8, until: "2026-12-31", plants: [["Kuping gajah", "Teras", "Sehat"], ["Philodendron", "Ruang tamu", "Sehat"]] },
  { acc: ["u-bayu", "Bayu Santoso", "bayu@kliniktangerang.id"], loc: ["l-klinik", "Klinik Gigi Tangerang", "Lainnya", "Jl. Imam Bonjol No. 21", "Karawaci"], start: 9, until: "2027-02-28", plants: [["Zamioculcas", "Ruang tunggu", "Sehat"], ["Lidah mertua", "Resepsi", "Dalam perawatan"]] },
  // calon klien (belum aktif)
  { acc: ["u-padang", "Sri Wahyuni", "sri@rmpadangkarawaci.id"], loc: ["l-padang", "Rumah Makan Padang Karawaci", "Restoran", "Jl. Karawaci Raya No. 55", "Karawaci"], plants: [["Palem kuning", "Ruang makan", "Sehat"], ["Sansevieria", "Kasir", "Sehat"], ["Monstera", "Dekat jendela", "Sehat"]] },
  { acc: ["u-foto", "Citra Ayu", "citra@studioalam.id"], loc: ["l-foto", "Studio Foto Alam", "Kantor", "Jl. Merdeka No. 14", "Cibodas"] },
  { acc: ["u-dinda", "Dinda Pratiwi", "dinda.pratiwi@gmail.com"], loc: ["l-dinda", "Rumah Dinda", "Rumah", "Perumahan Gading Serpong Blok E2", "Serpong"] },
  { acc: ["u-nadia", "Nadia Kusumawati", "nadia@kliniksehatserpong.id"] }, // baru mendaftar, belum punya lokasi
];
const ym = (m: number) => `2026-${String(m + 1).padStart(2, "0")}`;
const dd = (n: number) => String(n).padStart(2, "0");

function others(): Pick<DB, "accounts" | "locations" | "plants" | "visits" | "plans" | "invoices" | "threads" | "approvals"> {
  const accounts: Account[] = OTHERS.map((o) => ({ id: o.acc[0], name: o.acc[1], email: o.acc[2] }));
  const locations: Location[] = [];
  const plants: Plant[] = [];
  const plans: Plan[] = [];
  const invoices: Invoice[] = [];
  const visits: Visit[] = [];
  OTHERS.forEach((o, idx) => {
    if (!o.loc) return;
    const [lid, lname, type, street, district] = o.loc;
    locations.push({ id: lid, accountId: o.acc[0], name: lname, type, address: `${street}, Kec. ${district}, Kota Tangerang`, city: "Kota Tangerang", district });
    (o.plants ?? []).forEach(([n, a, st], k) => plants.push(plant(`${lid}-${k}`, lid, n, a, st)));
    if (o.start === undefined) return;
    plans.push({ locationId: lid, planId: "basic", status: "Aktif", until: o.until });
    const day = (m: number) => dd(2 + ((idx * 3 + m) % 8));
    invoices.push({ id: `INV-A${idx}`, locationId: lid, title: `Green Audit ${lname}`, amount: AUDIT_PRICE, due: `${ym(o.start)}-01`, status: "Lunas", paidAt: `${ym(o.start)}-${day(o.start)}`, method: "QRIS" });
    for (let m = o.start; m <= 9; m++)
      invoices.push({ id: `INV-${idx}-${m}`, locationId: lid, title: `Care Basic ${lname}, bulan ${m + 1}`, amount: 900_000, due: `${ym(m)}-10`, status: "Lunas", paidAt: `${ym(m)}-${day(m)}`, method: m % 2 ? "QRIS" : "Transfer BCA" });
    // Nov: sebagian sudah bayar, sebagian belum
    invoices.push(
      idx % 3 === 2
        ? { id: `INV-${idx}-10`, locationId: lid, title: `Care Basic ${lname}, November 2026`, amount: 900_000, due: "2026-11-10", status: "Belum dibayar" }
        : { id: `INV-${idx}-10`, locationId: lid, title: `Care Basic ${lname}, November 2026`, amount: 900_000, due: "2026-11-10", status: "Lunas", paidAt: `2026-11-0${1 + (idx % 6)}`, method: "QRIS" },
    );
    const d1 = 9 + (idx % 8);
    visits.push({ id: `v-${lid}-1`, locationId: lid, date: `2026-11-${dd(d1)}`, time: idx % 2 ? "09.00 – 11.00" : "13.00 – 15.00", type: "Perawatan rutin", staff: idx % 2 ? "Raka Wibisana" : "Indah Larasati", status: "Terjadwal", agenda });
    visits.push({ id: `v-${lid}-2`, locationId: lid, date: `2026-11-${dd(d1 + 14 > 28 ? 27 : d1 + 14)}`, time: "09.00 – 11.00", type: "Perawatan rutin", staff: idx % 2 ? "Indah Larasati" : "Raka Wibisana", status: "Terjadwal", agenda });
  });
  const rep = { id: "RPT-P1", sehat: 3, perhatian: 0, rawat: 0, acts: ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"], note: "Audit selesai. Tiga tanaman dicatat, cahaya cukup, rekomendasi Care Basic." };
  visits.push(
    { id: "v-padang-a", locationId: "l-padang", date: "2026-11-05", time: "10.00 – 11.30", type: "Audit lokasi", staff: "Indah Larasati", status: "Selesai", agenda: [], report: rep },
    { id: "v-foto-a", locationId: "l-foto", date: "2026-11-10", time: "10.00 – 11.30", type: "Audit lokasi", staff: "Raka Wibisana", status: "Terjadwal", agenda: ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"] },
    { id: "v-dinda-a", locationId: "l-dinda", date: "2026-11-12", time: "13.00 – 15.00", type: "Audit lokasi", staff: "Ditentukan tim", status: "Menunggu konfirmasi", agenda: ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"], resched: "Kamis, 12 Nov · 13.00" },
  );
  // pengajuan ubah jadwal dari klien aktif
  const pv = visits.find((v) => v.id === "v-l-pinang-1");
  if (pv) Object.assign(pv, { status: "Menunggu konfirmasi", staff: "Ditentukan tim", resched: "Selasa, 17 Nov · 14.00" });
  plans.push({ locationId: "l-padang", planId: "basic", status: "Menunggu audit" }, { locationId: "l-foto", planId: "basic", status: "Menunggu audit" }, { locationId: "l-dinda", planId: "basic", status: "Menunggu audit" });
  invoices.push(
    { id: "INV-AP", locationId: "l-padang", title: "Green Audit Rumah Makan Padang Karawaci", amount: AUDIT_PRICE, due: "2026-11-04", status: "Lunas", paidAt: "2026-11-03", method: "QRIS" },
    { id: "INV-AF", locationId: "l-foto", title: "Green Audit Studio Foto Alam", amount: AUDIT_PRICE, due: "2026-11-09", status: "Lunas", paidAt: "2026-11-06", method: "Transfer BCA" },
    { id: "INV-AD", locationId: "l-dinda", title: "Green Audit Rumah Dinda", amount: AUDIT_PRICE, due: "2026-11-14", status: "Belum dibayar" },
  );
  const msg = (id: string, from: "me" | "team", text: string, at: string): Msg => ({ id, from, text, at });
  const threads: Thread[] = [
    { id: "x1", locationId: "l-bakmi", title: "Daun monstera menguning", sub: "Bakmi Sahabat · Daun menguning", unread: 0, adminUnread: 1, acked: true, msgs: [msg("x1a", "me", "Daun monstera di dekat kasir menguning sejak minggu lalu. Mohon dicek.", "Hari ini, 08.14")] },
    { id: "x2", locationId: "l-pinang", title: "Ubah jadwal kunjungan", sub: "Kafe Teras Pinang · usulan Selasa, 17 Nov", unread: 0, adminUnread: 1, acked: true, msgs: [msg("x2a", "me", "Saya ingin memindahkan kunjungan 23 November ke Selasa, 17 Nov · 14.00.", "Kemarin, 16.40")] },
    { id: "x3", locationId: "l-benda", title: "Tambah satu kunjungan", sub: "Warung Kopi Benda · Pertanyaan", unread: 0, adminUnread: 1, acked: true, msgs: [msg("x3a", "me", "Apakah bisa tambah satu kunjungan di akhir bulan? Ada acara di café.", "Kemarin, 11.02")] },
    { id: "x4", locationId: "l-notaris", title: "Tagihan November", sub: "Kantor Notaris Wibowo · Pertanyaan", unread: 0, adminUnread: 0, acked: true, msgs: [msg("x4a", "me", "Tagihan November sudah saya bayar, mohon dikonfirmasi.", "5 Nov, 09.30"), msg("x4b", "team", "Terima kasih, pembayaran sudah kami terima dan bukti ada di menu Paket dan tagihan.", "5 Nov, 10.05")] },
    { id: "x5", locationId: "l-padang", title: "Penawaran paket", sub: "Rumah Makan Padang Karawaci · Audit", unread: 0, adminUnread: 1, acked: true, msgs: [msg("x5a", "team", "Audit selesai. Kami siapkan penawaran paket untuk Anda.", "5 Nov, 14.20"), msg("x5b", "me", "Baik, saya tunggu penawarannya. Boleh dikirim hari ini?", "Hari ini, 07.50")] },
  ];
  return { accounts, locations, plants, visits, plans, invoices, threads, approvals: [] };
}

export function seed(scenario: DB["scenario"]): DB {
  const o = others();
  const welcome = (extra: string): Thread => ({
    id: "tim",
    title: "Tim LESTARI",
    sub: "Pertanyaan umum",
    unread: scenario === "baru" ? 1 : 0,
    adminUnread: 0,
    msgs: [{ id: "t1", from: "team", text: extra, at: scenario === "baru" ? "Baru saja" : "3 Okt, 09.05" }],
  });

  if (scenario === "baru") {
    return {
      scenario,
      me: ME.id,
      scope: "all",
      accounts: [ME_NEW, ...o.accounts],
      locations: o.locations,
      plants: o.plants,
      visits: o.visits,
      approvals: [],
      invoices: o.invoices,
      plans: o.plans,
      threads: [welcome("Selamat datang di LESTARI. Daftarkan lokasi pertama Anda, lalu kami jadwalkan audit untuk memulai perawatan."), ...o.threads],
    };
  }

  const locations: Location[] = [
    { id: "l-senja", accountId: ME.id, name: "Café Senja", type: "Café", address: "Jl. Jend. Sudirman No. 18, Tangerang" },
    { id: "l-naraya", accountId: ME.id, name: "Kantor Naraya", type: "Kantor", address: "Jl. Boulevard Gading Serpong Blok M5, Tangerang" },
    ...o.locations,
  ];
  const plants: Plant[] = [
    {
      ...plant("karet-kebo", "l-senja", "Karet kebo", "Teras Depan", "Sehat", "/plants/karet-kebo.jpg", "Ficus elastica"),
      history: [
        { date: "31 Okt 2026", title: "Perawatan rutin", text: "Penyiraman, pembersihan daun, dan pengecekan media tanam.", by: "Raka Wibisana" },
        { date: "17 Okt 2026", title: "Pemupukan", text: "Pupuk organik cair dan pemangkasan ringan.", by: "Indah Larasati" },
      ],
    },
    {
      ...plant("palem-kuning", "l-senja", "Palem kuning", "Area Bar", "Perlu perhatian", "/plants/palem-kuning.jpg", "Dypsis lutescens"),
      history: [
        { date: "31 Okt 2026", title: "Ditandai perlu perhatian", text: "Daun menguning dan akar membusuk akibat drainase kurang. Penggantian disarankan.", by: "Indah Larasati" },
        { date: "17 Okt 2026", title: "Penyesuaian penyiraman", text: "Frekuensi siram dikurangi dan media dicek ulang.", by: "Raka Wibisana" },
      ],
    },
    {
      ...plant("ficus-lyrata", "l-senja", "Ficus lyrata", "Area Indoor", "Sehat", "/plants/ficus-lyrata.jpg", "Ficus lyrata"),
      history: [{ date: "31 Okt 2026", title: "Perawatan rutin", text: "Pembersihan daun dan rotasi pot 45°.", by: "Raka Wibisana" }],
    },
    {
      ...plant("ficus-lobi", "l-naraya", "Ficus lyrata", "Lobi", "Dalam perawatan", "/plants/ficus-lobi.jpg", "Ficus lyrata"),
      history: [{ date: "6 Nov 2026", title: "Dipindah ke tempat lebih terang", text: "Daun mulai rontok setelah dipindah. Dipantau dua minggu.", by: "Indah Larasati" }],
    },
    plant("sansevieria", "l-naraya", "Sansevieria", "Ruang Rapat", "Sehat", "/plants/sansevieria.jpg", "Dracaena trifasciata"),
    plant("monstera", "l-naraya", "Monstera deliciosa", "Ruang Rapat", "Sehat", "/plants/monstera.jpg", "Monstera deliciosa"),
    ...o.plants,
  ];
  const rpt = (id: string, s: number, p: number, r: number, note: string, a = acts): Report => ({ id, sehat: s, perhatian: p, rawat: r, acts: a, note });
  const visits: Visit[] = [
    { id: "20261114", locationId: "l-senja", date: "2026-11-14", time: "09.00 – 11.00", type: "Perawatan rutin", staff: "Raka Wibisana", status: "Terjadwal", agenda },
    { id: "20261128", locationId: "l-senja", date: "2026-11-28", time: "09.00 – 11.00", type: "Perawatan rutin", staff: "Raka Wibisana", status: "Terjadwal", agenda },
    { id: "20261120", locationId: "l-naraya", date: "2026-11-20", time: "13.00 – 14.30", type: "Perawatan rutin", staff: "Indah Larasati", status: "Terjadwal", agenda },
    { id: "20261031", locationId: "l-senja", date: "2026-10-31", time: "09.00 – 10.40", type: "Perawatan rutin", staff: "Raka Wibisana", status: "Selesai", agenda: [], report: rpt("RPT-1031", 2, 1, 0, "Palem kuning di Area Bar menunjukkan akar busuk dan sulit pulih. Kami sarankan penggantian sebelum kunjungan berikutnya.") },
    { id: "20261017", locationId: "l-senja", date: "2026-10-17", time: "09.00 – 10.30", type: "Perawatan rutin", staff: "Indah Larasati", status: "Selesai", agenda: [], report: rpt("RPT-1017", 3, 0, 0, "Semua tanaman dalam kondisi baik. Pemupukan dilakukan.", acts.slice(0, 3)) },
    { id: "20261003", locationId: "l-senja", date: "2026-10-03", time: "09.30 – 11.00", type: "Perawatan rutin", staff: "Raka Wibisana", status: "Selesai", agenda: [], report: rpt("RPT-1003", 3, 0, 0, "Rotasi pot dilakukan untuk pertumbuhan daun merata.") },
    { id: "20261106", locationId: "l-naraya", date: "2026-11-06", time: "13.00 – 14.30", type: "Perawatan rutin", staff: "Indah Larasati", status: "Selesai", agenda: [], report: rpt("RPT-1106", 2, 0, 1, "Ficus lyrata di lobi dipindah ke sisi jendela yang lebih terang dan akan dipantau.") },
    { id: "20261023", locationId: "l-naraya", date: "2026-10-23", time: "13.00 – 14.30", type: "Audit lokasi", staff: "Indah Larasati", status: "Selesai", agenda: [], report: rpt("RPT-1023", 3, 0, 0, "Audit awal selesai. Tiga tanaman dicatat dan paket Care Basic diaktifkan.", ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"]) },
    ...o.visits,
  ];
  const approvals: Approval[] = [
    { id: "ap-1", locationId: "l-senja", plantId: "palem-kuning", title: "Penggantian palem kuning", reason: "Daun menguning dan akar membusuk akibat drainase kurang. Peluang pulih rendah. Diganti dengan palem kuning 120–140 cm termasuk pot, media, dan pemasangan.", amount: 485_000, status: "Menunggu keputusan", createdAt: "2026-10-31", threadId: "approval" },
    { id: "ap-2", locationId: "l-senja", title: "Pot baru ficus lyrata", reason: "Pot lama retak dan media memadat.", amount: 180_000, status: "Disetujui", createdAt: "2026-09-02", threadId: "tim" },
    { id: "ap-3", locationId: "l-senja", title: "Nutrisi tambahan", reason: "Pertumbuhan daun melambat.", amount: 95_000, status: "Disetujui", createdAt: "2026-08-10", threadId: "tim" },
  ];
  const mine = (id: string, loc: string, title: string, m: string, st: Invoice["status"], due: string, paidAt?: string, method?: string): Invoice => ({ id, locationId: loc, title, amount: 900_000, due, status: st, paidAt, method });
  const invoices: Invoice[] = [
    mine("INV-1101", "l-senja", "Care Basic Café Senja, November 2026", "", "Belum dibayar", "2026-11-10"),
    mine("INV-1001", "l-senja", "Care Basic Café Senja, Oktober 2026", "", "Lunas", "2026-10-10", "2026-10-08", "QRIS"),
    mine("INV-0901", "l-senja", "Care Basic Café Senja, September 2026", "", "Lunas", "2026-09-10", "2026-09-09", "Transfer BCA"),
    mine("INV-0801", "l-senja", "Care Basic Café Senja, Agustus 2026", "", "Lunas", "2026-08-10", "2026-08-10", "QRIS"),
    mine("INV-N11", "l-naraya", "Care Basic Kantor Naraya, November 2026", "", "Lunas", "2026-11-10", "2026-11-05", "Transfer Mandiri"),
    { id: "INV-NA", locationId: "l-naraya", title: "Green Audit Kantor Naraya", amount: AUDIT_PRICE, due: "2026-10-22", status: "Lunas", paidAt: "2026-10-20", method: "QRIS" },
    ...o.invoices,
  ];
  const plans: Plan[] = [
    { locationId: "l-senja", planId: "basic", status: "Aktif", until: "2026-12-31" },
    { locationId: "l-naraya", planId: "basic", status: "Aktif", until: "2027-01-31" },
    ...o.plans,
  ];
  const threads: Thread[] = [
    ...o.threads,
    {
      id: "approval",
      locationId: "l-senja",
      title: "Penggantian palem kuning",
      sub: "Café Senja · persetujuan biaya",
      unread: 1,
      adminUnread: 0,
      acked: true,
      msgs: [
        { id: "a1", from: "team", text: "Palem kuning di Area Bar menunjukkan akar busuk dan peluang pulihnya rendah. Kami sarankan penggantian sebelum kunjungan 14 November. Estimasi Rp485.000, sudah termasuk tanaman, media, dan pemasangan.", at: "31 Okt, 10.52" },
      ],
    },
    welcome("Halo Sarah, ada yang bisa kami bantu soal tanaman di Café Senja dan Kantor Naraya?"),
  ];
  return { scenario, me: ME.id, scope: "all", accounts: [ME, ...o.accounts], locations, plants, visits, approvals, invoices, plans, threads };
}
