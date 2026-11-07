import { FormEvent, useState } from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  Landmark,
  Leaf,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  QrCode,
  RotateCcw,
  Share2,
  UserRound,
} from "lucide-react";
import { AUDIT_PRICE, LOCATION_TYPES, LocationType, PLAN_CATALOG, day, fmt, idr, iso, planOf } from "@/lib/data";
import { Missing } from "@/customer/screens";
import { auth, back, go, onboarded, returnTo, swap } from "@/lib/router";
import { Slot, fileToDataUrl, useStore } from "@/lib/store";
import { AREAS, AddressField, Addr, addrOk, addrText, emptyAddr } from "@/components/address";
import { GoogleG, Head, Qr, SelectField, Sheet, SlotField, Status, ic, initials, share } from "@/components/ui";

/** Foto opsional dengan pratinjau; menyimpan data URL kecil. */
function PhotoField({ value, onChange, label = "Foto" }: { value?: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="field">
      <span>{label}</span>
      <label className="btn">
        <Camera {...ic} />
        {value ? "Ganti foto" : "Ambil atau pilih foto"}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onChange(await fileToDataUrl(f));
          }}
        />
      </label>
      {value && <img className="preview" src={value} alt="Pratinjau foto" />}
    </div>
  );
}

/* ---------- Lokasi ---------- */

const COUNTS = ["1–5", "6–15", "16–30", "Lebih dari 30"];

export function LocationForm() {
  const { addLocation } = useStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<LocationType | "">("");
  const [addr, setAddr] = useState<Addr>(emptyAddr);
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [slot, setSlot] = useState<Slot>();
  const [busy, setBusy] = useState(false);
  const ok = name.trim() && type && addrOk(addr) && count && slot;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok || !type || !slot) return;
    setBusy(true);
    window.setTimeout(() => {
      addLocation({ name: name.trim(), type, address: addrText(addr), city: addr.city, district: addr.district, postal: addr.postal, count, note: note.trim(), photo, slot });
      swap("/");
    }, 400);
  };
  return (
    <main className="screen">
      <Head title="Daftarkan lokasi" onBack={() => back("/")} />
      <form onSubmit={submit}>
        <label className="field">
          <span>Nama lokasi</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Café Senja" />
        </label>
        <div className="field">
          <span>Jenis</span>
          <div className="chips" style={{ margin: 0, padding: 0, flexWrap: "wrap" }}>
            {LOCATION_TYPES.map((t) => (
              <button type="button" key={t} className={`chip ${type === t ? "on" : ""}`} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <AddressField value={addr} onChange={setAddr} />
        <SelectField label="Perkiraan jumlah tanaman" title="Perkiraan jumlah tanaman" value={count} options={COUNTS} onChange={setCount} />
        <PhotoField value={photo} onChange={setPhoto} label="Foto lokasi (opsional)" />
        <label className="field">
          <span>Catatan (opsional)</span>
          <textarea className="area" style={{ minHeight: 72 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misalnya jam buka atau akses parkir" />
        </label>
        <SlotField label="Usulan jadwal audit" value={slot} onChange={setSlot} />
        <p className="sub" style={{ marginBottom: 16 }}>
          Green Audit Rp250.000, ditagihkan setelah pengajuan.
        </p>
        <button className="btn primary" disabled={!ok || busy}>
          {busy ? "Mengirim…" : "Daftarkan lokasi"}
        </button>
      </form>
    </main>
  );
}

export function Locations() {
  const { myLocations, db } = useStore();
  return (
    <main className="screen">
      <Head title="Lokasi saya" onBack={() => back("/account")} />
      <div className="list">
        {myLocations.map((l) => {
          const plan = db.plans.find((p) => p.locationId === l.id);
          return (
            <div key={l.id}>
              <span className="icon-box">
                <MapPin {...ic} />
              </span>
              <span className="body">
                <strong className="clamp">{l.name}</strong>
                <span className="sub clamp">
                  {l.type} · {db.plants.filter((p) => p.locationId === l.id).length} tanaman
                </span>
              </span>
              <span className={`st ${plan?.status === "Aktif" ? "st-ok" : "st-warn"}`}>
                <i />
                {plan?.status === "Aktif" ? "Paket aktif" : "Menunggu audit"}
              </span>
            </div>
          );
        })}
      </div>
      <button className="btn primary" style={{ marginTop: 24 }} onClick={() => go("/location/new")}>
        <Plus {...ic} />
        Tambah lokasi
      </button>
    </main>
  );
}

/* ---------- Tanaman baru ---------- */

export function PlantForm() {
  const { myLocations, scope, addPlant } = useStore();
  const [loc, setLoc] = useState(scope !== "all" ? scope : myLocations.length === 1 ? myLocations[0].id : "");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [area, setArea] = useState("");
  const [img, setImg] = useState<string>();
  if (myLocations.length === 0)
    return (
      <main className="screen">
        <Head title="Tambah tanaman" onBack={() => back("/plants")} />
        <div className="card empty-card">
          <p className="t2">Daftarkan lokasi dulu sebelum menambah tanaman.</p>
          <button className="btn primary" onClick={() => swap("/location/new")}>
            Daftarkan lokasi
          </button>
        </div>
      </main>
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!loc || !name.trim() || !area.trim()) return;
    addPlant({ locationId: loc, name: name.trim(), species: species.trim(), area: area.trim(), image: img });
    back("/plants");
  };
  return (
    <main className="screen">
      <Head title="Tambah tanaman" onBack={() => back("/plants")} />
      <form onSubmit={submit}>
        {myLocations.length > 1 && (
          <SelectField label="Lokasi" title="Pilih lokasi" value={loc} options={myLocations.map((l) => ({ value: l.id, label: l.name, sub: l.type }))} onChange={setLoc} />
        )}
        <label className="field">
          <span>Nama tanaman</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Monstera" />
        </label>
        <label className="field">
          <span>Jenis atau nama ilmiah (opsional)</span>
          <input className="input" value={species} onChange={(e) => setSpecies(e.target.value)} />
        </label>
        <label className="field">
          <span>Area di lokasi</span>
          <input className="input" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Contoh: Teras Depan" />
        </label>
        <PhotoField value={img} onChange={setImg} />
        <p className="sub" style={{ marginBottom: 16 }}>
          Kondisi tercatat sebagai "Belum dicek" sampai tim memeriksanya.
        </p>
        <button className="btn primary" disabled={!loc || !name.trim() || !area.trim()}>
          Simpan tanaman
        </button>
      </form>
    </main>
  );
}

/* ---------- Persetujuan ---------- */

export function Approval({ id }: { id: string }) {
  const { db, decide, locName, showLoc } = useStore();
  const [ask, setAsk] = useState<"Disetujui" | "Ditolak" | null>(null);
  const a = db.approvals.find((x) => x.id === id);
  if (!a) return <Missing to="/" />;
  const plant = db.plants.find((p) => p.id === a.plantId);
  return (
    <main className="screen">
      <Head title={a.title} sub={`Persetujuan biaya${showLoc ? ` · ${locName(a.locationId)}` : ""}`} onBack={() => back("/")} />
      <Status label={a.status} />
      {plant?.image && <img className="hero-photo" style={{ marginTop: 16 }} src={plant.image} alt={plant.name} />}
      <h2 className="h2">Penjelasan</h2>
      <p className="t2">{a.reason}</p>
      <div className="card" style={{ marginTop: 24 }}>
        <p className="sub">Estimasi biaya</p>
        <p className="big num">{idr(a.amount)}</p>
        <p className="sub">Tanpa biaya lain. Masuk ke tagihan setelah Anda setuju.</p>
      </div>
      {a.status === "Menunggu keputusan" ? (
        <div className="stack" style={{ marginTop: 24 }}>
          <button className="btn primary" onClick={() => setAsk("Disetujui")}>
            Setujui biaya
          </button>
          <button className="btn danger" onClick={() => setAsk("Ditolak")}>
            Tolak
          </button>
          <button className="btn quiet" onClick={() => go(`/thread/${a.threadId}`)}>
            Tanya tim dulu
          </button>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 24 }}>
          {a.status === "Disetujui" && (
            <button className="btn primary" onClick={() => go("/billing")}>
              Lihat tagihan
            </button>
          )}
          <button className="btn" onClick={() => go(`/thread/${a.threadId}`)}>
            Buka percakapan
          </button>
        </div>
      )}
      {ask && (
        <Sheet onClose={() => setAsk(null)}>
          <h2>{ask === "Disetujui" ? "Setujui biaya ini" : "Tolak permintaan ini"}</h2>
          <p className="t2">
            {ask === "Disetujui"
              ? `Tim menjadwalkan pekerjaan pada kunjungan berikutnya dan tagihan ${idr(a.amount)} dibuat.`
              : "Pekerjaan tidak dilakukan. Anda tetap bisa menghubungi tim lewat Pesan."}
          </p>
          <button
            className={`btn ${ask === "Disetujui" ? "primary" : "danger"}`}
            onClick={() => {
              decide(a.id, ask);
              setAsk(null);
            }}
          >
            {ask === "Disetujui" ? "Ya, setujui" : "Ya, tolak"}
          </button>
          <button className="btn quiet" onClick={() => setAsk(null)}>
            Kembali
          </button>
        </Sheet>
      )}
    </main>
  );
}

export function ApprovalHistory() {
  const { db, inScope } = useStore();
  const list = inScope(db.approvals);
  return (
    <main className="screen">
      <Head title="Riwayat persetujuan" onBack={() => back("/account")} />
      {list.length === 0 && <p className="empty">Belum ada permintaan persetujuan.</p>}
      <div className="list">
        {list.map((a) => (
          <button key={a.id} onClick={() => go(`/approval/${a.id}`)}>
            <span className="body">
              <strong className="clamp">{a.title}</strong>
              <Status label={a.status} />
            </span>
            <span className="end num">{idr(a.amount)}</span>
          </button>
        ))}
      </div>
    </main>
  );
}

/* ---------- Lapor masalah ---------- */

const KINDS = ["Daun menguning", "Hama", "Layu", "Pot atau media", "Lainnya"];

export function ReportIssue({ plantId }: { plantId?: string }) {
  const { db, inScope, reportIssue, locName, showLoc } = useStore();
  const plants = inScope(db.plants);
  const [pid, setPid] = useState(plantId ?? "");
  const [kind, setKind] = useState("");
  const [note, setNote] = useState("");
  const [img, setImg] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (plants.length === 0)
    return (
      <main className="screen">
        <Head title="Lapor masalah" onBack={() => back("/")} />
        <div className="card empty-card">
          <p className="t2">Belum ada tanaman untuk dilaporkan. Tambahkan tanaman dulu, atau kirim pesan ke tim.</p>
          <button className="btn primary" onClick={() => swap("/plant/new")}>
            Tambah tanaman
          </button>
          <button className="btn quiet" onClick={() => swap("/thread/tim")}>
            Kirim pesan
          </button>
        </div>
      </main>
    );
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!pid || !kind) return;
    setBusy(true);
    window.setTimeout(() => swap(`/thread/${reportIssue({ plantId: pid, kind, note: note.trim(), img })}`), 400);
  };
  return (
    <main className="screen">
      <Head title="Lapor masalah" onBack={() => back("/")} />
      <form onSubmit={submit}>
        <SelectField
          label="Tanaman"
          title="Pilih tanaman"
          value={pid}
          options={db.plants.filter((p) => plants.includes(p) || p.id === pid).map((p) => ({ value: p.id, label: p.name, sub: `${p.area}${showLoc ? ` · ${locName(p.locationId)}` : ""}` }))}
          onChange={setPid}
        />
        <div className="field">
          <span>Jenis masalah</span>
          <div className="chips" style={{ margin: 0, padding: 0, flexWrap: "wrap" }}>
            {KINDS.map((k) => (
              <button type="button" key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Catatan</span>
          <textarea className="area" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ceritakan yang Anda lihat" />
        </label>
        <PhotoField value={img} onChange={setImg} />
        <button className="btn primary" disabled={busy || !pid || !kind}>
          {busy ? "Mengirim…" : "Kirim laporan"}
        </button>
      </form>
    </main>
  );
}

/* ---------- Akun ---------- */

export function Account() {
  const { db, me, inScope, reset } = useStore();
  if (auth.mode() === "guest")
    return (
      <main className="screen">
        <Head title="Akun" />
        <div className="card empty-card">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 17 }}>Anda belum masuk</h2>
            <p className="t2">Masuk dengan Google untuk mendaftarkan lokasi dan mengelola layanan perawatan.</p>
          </div>
          <button className="btn google" onClick={() => swap("/login")}>
            <GoogleG />
            Masuk dengan Google
          </button>
        </div>
        <div className="list" style={{ marginTop: 24 }}>
          <button onClick={() => go("/plans")}>
            <CreditCard {...ic} />
            <span className="body">Paket dan harga</span>
            <ChevronRight className="chev" {...ic} />
          </button>
          <button onClick={() => go("/welcome")}>
            <CircleHelp {...ic} />
            <span className="body">Cara kerja</span>
            <ChevronRight className="chev" {...ic} />
          </button>
        </div>
      </main>
    );
  const unpaid = inScope(db.invoices).filter((i) => i.status === "Belum dibayar").length;
  const items = [
    { icon: UserRound, label: "Edit profil", to: "/profile" },
    { icon: MapPin, label: "Lokasi saya", to: "/locations", end: String(db.locations.filter((l) => l.accountId === db.me).length) },
    { icon: CreditCard, label: "Paket dan tagihan", to: "/billing", end: unpaid ? `${unpaid} belum dibayar` : "" },
    { icon: FileText, label: "Riwayat persetujuan", to: "/approvals" },
    { icon: Bell, label: "Pengaturan notifikasi", to: "/notif-settings" },
    { icon: CircleHelp, label: "Bantuan", to: "/thread/tim" },
  ];
  return (
    <main className="screen">
      <Head title="Akun" />
      <div className="row" style={{ cursor: "default" }}>
        <span className="date-box" style={{ borderRadius: "50%" }}>
          <strong>{initials(me.name || me.email)}</strong>
        </span>
        <span className="body">
          <strong className="clamp">{me.name || "Nama belum diisi"}</strong>
          <span className="sub clamp">{me.email}</span>
        </span>
      </div>
      <div className="list" style={{ marginTop: 24 }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button key={it.label} onClick={() => go(it.to)}>
              <Icon {...ic} />
              <span className="body">{it.label}</span>
              {it.end && <span className={`st ${it.end.includes("belum") ? "st-warn" : "st-mute"}`}>{it.end}</span>}
              <ChevronRight className="chev" {...ic} />
            </button>
          );
        })}
      </div>
      <div className="stack" style={{ marginTop: 24 }}>
        <button
          className="btn danger"
          onClick={() => {
            auth.set(false);
            swap("/login");
          }}
        >
          <LogOut {...ic} />
          Keluar
        </button>
        <button
          className="btn quiet"
          onClick={() => {
            reset(db.scenario);
            swap(db.scenario === "baru" ? "/welcome" : "/");
          }}
        >
          <RotateCcw {...ic} />
          Atur ulang data demo
        </button>
      </div>
    </main>
  );
}

export function EditProfile() {
  const { toast, me } = useStore();
  return (
    <main className="screen">
      <Head title="Edit profil" onBack={() => back("/account")} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast("Profil disimpan");
          back("/account");
        }}
      >
        {[
          ["Nama", me.name, "text"],
          ["Email", me.email, "email"],
          ["Telepon", me.phone ?? "", "tel"],
        ].map(([l, v, t]) => (
          <label className="field" key={l}>
            <span>{l}</span>
            <input className="input" type={t} defaultValue={v} />
          </label>
        ))}
        <button className="btn primary">Simpan</button>
      </form>
    </main>
  );
}

export function NotifSettings() {
  const [on, setOn] = useState<Record<string, boolean>>({ Kunjungan: true, Laporan: true, Persetujuan: true, Tagihan: true });
  return (
    <main className="screen">
      <Head title="Notifikasi" onBack={() => back("/account")} />
      <div className="list">
        {Object.keys(on).map((k) => (
          <button key={k} role="switch" aria-checked={on[k]} onClick={() => setOn({ ...on, [k]: !on[k] })}>
            <span className="body">{k}</span>
            <span className={`switch ${on[k] ? "on" : ""}`} />
          </button>
        ))}
      </div>
    </main>
  );
}

export function Notifications() {
  const { db, inScope } = useStore();
  const approvals = inScope(db.approvals).filter((a) => a.status === "Menunggu keputusan");
  const due = inScope(db.invoices).filter((i) => i.status === "Belum dibayar");
  const visit = inScope(db.visits).filter((v) => v.status === "Terjadwal").sort((a, b) => a.date.localeCompare(b.date))[0];
  const done = inScope(db.visits).filter((v) => v.status === "Selesai").sort((a, b) => b.date.localeCompare(a.date))[0];
  const items = [
    ...approvals.map((a) => ({ icon: Leaf, t: "Persetujuan biaya menunggu", s: a.title, to: `/approval/${a.id}` })),
    ...due.map((i) => ({ icon: CreditCard, t: "Tagihan belum dibayar", s: `${i.title} · ${fmt(i.due)}`, to: `/pay/${i.id}` })),
    ...db.threads.filter((t) => t.unread).map((t) => ({ icon: MessageCircle, t: "Pesan baru", s: t.title, to: `/thread/${t.id}` })),
    ...(visit ? [{ icon: CalendarDays, t: "Pengingat kunjungan", s: `${fmt(visit.date)} · ${visit.time}`, to: `/visit/${visit.id}` }] : []),
    ...(done ? [{ icon: FileText, t: "Laporan tersedia", s: `Kunjungan ${fmt(done.date)}`, to: `/visit/${done.id}` }] : []),
  ];
  return (
    <main className="screen">
      <Head title="Notifikasi" onBack={() => back("/")} />
      {items.length === 0 && <p className="empty">Belum ada notifikasi.</p>}
      <div className="list">
        {items.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.t + n.s} onClick={() => go(n.to)}>
              <span className="icon-box">
                <Icon {...ic} />
              </span>
              <span className="body">
                <strong className="clamp">{n.t}</strong>
                <span className="sub clamp">{n.s}</span>
              </span>
              <ChevronRight className="chev" {...ic} />
            </button>
          );
        })}
      </div>
    </main>
  );
}

/* ---------- Paket, tagihan, bayar ---------- */

export function Billing() {
  const { db, inScope, locName, showLoc } = useStore();
  const plans = inScope(db.plans.map((p) => p)).filter((p) => db.locations.some((l) => l.id === p.locationId && l.accountId === db.me));
  const inv = inScope(db.invoices);
  const unpaid = inv.filter((i) => i.status === "Belum dibayar");
  const paid = inv.filter((i) => i.status === "Lunas");
  const row = (i: (typeof inv)[number]) => (
    <button key={i.id} onClick={() => go(`/pay/${i.id}`)}>
      <span className="body">
        <strong className="clamp">{i.title}</strong>
        <span className="sub">{i.status === "Lunas" ? `Dibayar ${fmt(i.paidAt!)}` : `Jatuh tempo ${fmt(i.due)}`}</span>
      </span>
      <span className="body" style={{ flex: "none", justifyItems: "end" }}>
        <span className="end num">{idr(i.amount)}</span>
        <Status label={i.status} />
      </span>
    </button>
  );
  return (
    <main className="screen">
      <Head title="Paket dan tagihan" onBack={() => back("/account")} />
      {plans.length === 0 && <p className="empty">Belum ada paket. Daftarkan lokasi untuk memulai.</p>}
      <div className="stack">
        {plans.map((p) => {
          const pl = planOf(p.planId);
          return (
            <div className="card" key={p.locationId}>
              <p className="sub">{showLoc || plans.length > 1 ? locName(p.locationId) : "Paket aktif"}</p>
              <p className="big">{pl.name}</p>
              {p.status === "Aktif" ? (
                <>
                  <p className="t2">
                    {pl.note} · {idr(pl.price)} per bulan
                  </p>
                  <p className="sub" style={{ marginTop: 8 }}>
                    Aktif sampai {fmt(p.until!, { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <button className="btn primary" style={{ marginTop: 16 }} onClick={() => go(`/renew/${p.locationId}`)}>
                    Perpanjang paket
                  </button>
                </>
              ) : (
                <p className="t2">Menunggu audit. Paket diaktifkan setelah audit selesai.</p>
              )}
            </div>
          );
        })}
      </div>
      {unpaid.length > 0 && (
        <>
          <h2 className="h2">Perlu dibayar</h2>
          <div className="list">{unpaid.map(row)}</div>
        </>
      )}
      {paid.length > 0 && (
        <>
          <h2 className="h2">Riwayat</h2>
          <div className="list">{paid.map(row)}</div>
        </>
      )}
    </main>
  );
}

const METHODS = [
  { id: "QRIS", sub: "Semua e-wallet dan m-banking", icon: QrCode },
  { id: "Transfer BCA", sub: "Virtual account", icon: Landmark },
  { id: "Transfer Mandiri", sub: "Virtual account", icon: Landmark },
];

export function Pay({ id }: { id: string }) {
  const { db, pay, toast } = useStore();
  const inv = db.invoices.find((i) => i.id === id);
  const [method, setMethod] = useState("");
  const [step, setStep] = useState<"pick" | "instr" | "busy">("pick");
  if (!inv) return <Missing to="/billing" />;

  if (inv.status === "Lunas")
    return (
      <main className="screen">
        <Head title="Bukti pembayaran" onBack={() => back("/billing")} />
        <div className="stack" style={{ justifyItems: "center", textAlign: "center", marginTop: 16 }}>
          <span className="done-mark">
            <Check size={28} strokeWidth={1.5} />
          </span>
          <h1 className="big">Pembayaran diterima</h1>
          <p className="t2 num">{idr(inv.amount)}</p>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <div className="kv">
            {[
              ["Tagihan", inv.title],
              ["Nomor", inv.id],
              ["Metode", inv.method ?? "-"],
              ["Tanggal", fmt(inv.paidAt!, { day: "numeric", month: "long", year: "numeric" })],
            ].map(([k, v]) => (
              <div key={k} style={{ justifyContent: "space-between" }}>
                <p className="sub">{k}</p>
                <p style={{ textAlign: "right" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="stack" style={{ marginTop: 24 }}>
          <button className="btn" onClick={() => share(`Bukti ${inv.id}`)}>
            <Share2 {...ic} />
            Bagikan bukti
          </button>
          <button className="btn primary" onClick={() => back("/billing")}>
            Selesai
          </button>
        </div>
      </main>
    );

  const confirm = () => {
    setStep("busy");
    window.setTimeout(() => {
      pay(inv.id, method);
      toast("Pembayaran diterima");
    }, 1400);
  };
  const va = method === "Transfer BCA" ? "8277 0812 8900 1122" : "8890 0812 8900 1122";

  return (
    <main className="screen">
      <Head title="Bayar tagihan" onBack={() => (step === "instr" ? setStep("pick") : back("/billing"))} />
      <div className="card">
        <p className="sub">{inv.title}</p>
        <p className="big num">{idr(inv.amount)}</p>
        <p className="sub">Jatuh tempo {fmt(inv.due, { day: "numeric", month: "long" })}</p>
      </div>
      {step === "pick" && (
        <>
          <h2 className="h2">Metode pembayaran</h2>
          <div className="opts">
            {METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} className={`opt ${method === m.id ? "on" : ""}`} onClick={() => setMethod(m.id)}>
                  <Icon {...ic} />
                  <span className="body">
                    <strong>{m.id}</strong>
                    <span className="sub">{m.sub}</span>
                  </span>
                  <span className="radio" />
                </button>
              );
            })}
          </div>
          <button className="btn primary" style={{ marginTop: 24 }} disabled={!method} onClick={() => setStep("instr")}>
            Lanjut
          </button>
        </>
      )}
      {step !== "pick" && (
        <>
          {method === "QRIS" ? (
            <>
              <h2 className="h2">Pindai dengan aplikasi pembayaran</h2>
              <Qr />
            </>
          ) : (
            <>
              <h2 className="h2">Nomor virtual account {method.replace("Transfer ", "")}</h2>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <p className="mono" style={{ flex: 1 }}>
                  {va}
                </p>
                <button
                  className="btn"
                  style={{ width: "auto" }}
                  onClick={() => {
                    navigator.clipboard?.writeText(va.replace(/\s/g, "")).catch(() => {});
                    toast("Nomor disalin");
                  }}
                >
                  Salin
                </button>
              </div>
            </>
          )}
          <p className="sub" style={{ marginTop: 12, textAlign: "center" }}>
            Berlaku 24 jam. Pembayaran terkonfirmasi otomatis.
          </p>
          <button className="btn primary" style={{ marginTop: 24 }} disabled={step === "busy"} onClick={confirm}>
            {step === "busy" ? "Memeriksa pembayaran…" : "Saya sudah membayar"}
          </button>
        </>
      )}
    </main>
  );
}

export function Renew({ locationId }: { locationId: string }) {
  const { db, renew, locName } = useStore();
  const [m, setM] = useState(0);
  const plan = db.plans.find((p) => p.locationId === locationId);
  if (!plan || plan.status !== "Aktif") return <Missing to="/billing" />;
  const price = planOf(plan.planId).price;
  const base = day(plan.until!);
  const until = new Date(base.getFullYear(), base.getMonth() + (m || 0) + 1, 0);
  return (
    <main className="screen">
      <Head title="Perpanjang paket" sub={`${planOf(plan.planId).name} · ${locName(locationId)}`} onBack={() => back("/billing")} />
      <div className="opts">
        {[1, 3, 6].map((n) => (
          <button key={n} className={`opt ${m === n ? "on" : ""}`} onClick={() => setM(n)}>
            <span className="radio" />
            <span className="body">
              <strong>{n} bulan</strong>
              <span className="sub">{n * 2} kunjungan</span>
            </span>
            <span className="end num" style={{ fontWeight: 500 }}>
              {idr(price * n)}
            </span>
          </button>
        ))}
      </div>
      {m > 0 && (
        <p className="card t2" style={{ marginTop: 24 }}>
          Paket aktif sampai {fmt(iso(until), { day: "numeric", month: "long", year: "numeric" })} setelah pembayaran.
        </p>
      )}
      <button className="btn primary" style={{ marginTop: 24 }} disabled={!m} onClick={() => swap(`/pay/${renew(locationId, m)}`)}>
        {m ? `Buat tagihan ${idr(price * m)}` : "Pilih lama perpanjangan"}
      </button>
    </main>
  );
}

/* ---------- Pengaturan awal profil ---------- */

export function ProfileSetup() {
  const { me, updateProfile } = useStore();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? "");
  const ok = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;
  return (
    <main className="screen bare">
      <form
        className="center"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ok) return;
          updateProfile(name.trim(), phone.trim());
          swap(returnTo.take() ?? (onboarded.get() ? "/" : "/welcome"));
        }}
      >
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="hero-title">Lengkapi profil Anda</h1>
          <p className="t2">Masuk sebagai {me.email}. Nama dan nomor telepon dipakai tim untuk menghubungi Anda.</p>
        </div>
        <div>
          <label className="field">
            <span>Nama lengkap</span>
            <input className="input" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Nomor telepon</span>
            <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="0812 0000 0000" onChange={(e) => setPhone(e.target.value)} />
          </label>
          <button className="btn primary" disabled={!ok}>
            Lanjut
          </button>
        </div>
      </form>
    </main>
  );
}

/* ---------- Paket dan harga (baca-saja, bisa dibuka tanpa login) ---------- */

export function PlansInfo() {
  return (
    <main className="screen">
      <Head title="Paket dan harga" onBack={() => back("/")} />
      <h2 className="h2">1. Mulai dengan audit</h2>
      <div className="card">
        <p className="sub">Green Audit, sekali bayar</p>
        <p className="big num">{idr(AUDIT_PRICE)}</p>
        <p className="t2" style={{ marginTop: 8 }}>
          Tim datang ke lokasi, mencatat tanaman, memeriksa cahaya dan media, lalu merekomendasikan paket. Dibayar sebelum audit.
        </p>
      </div>
      <h2 className="h2">2. Pilih paket setelah audit</h2>
      <div className="stack">
        {PLAN_CATALOG.map((p) => (
          <div className="card" key={p.id}>
            <p className="sub">{p.name}</p>
            <p className="big num">
              {idr(p.price)} <span className="t2" style={{ fontSize: 17, fontWeight: 400 }}>per bulan</span>
            </p>
            <p className="t2" style={{ marginTop: 8 }}>
              {p.note}
            </p>
          </div>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 12 }}>
        Harga paket final ditetapkan setelah audit. Anda yang memutuskan, dan tidak ada biaya tambahan tanpa persetujuan.
      </p>
      <h2 className="h2">Area layanan</h2>
      <p className="t2">{Object.keys(AREAS).join(", ")}</p>
      <button className="btn primary" style={{ marginTop: 32 }} onClick={() => go("/location/new")}>
        Daftarkan lokasi
      </button>
    </main>
  );
}
