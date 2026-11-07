import { FormEvent, ReactNode, useState } from "react";
import { Check, ChevronDown, ExternalLink, Inbox, LayoutDashboard, CalendarDays, LogOut, RotateCcw, Send, Users } from "lucide-react";
import {
  DB,
  PLANT_STATUS,
  PlantStatus,
  Plant,
  SERVICE_TYPES,
  TODAY,
  Visit,
  day,
  fmt,
  idr,
  iso,
  planOf,
  pushMsg,
  uid,
} from "@/lib/data";
import { auth, go, swap } from "@/lib/router";
import { fileToDataUrl, useStore } from "@/lib/store";
import { Sheet, Status, ic } from "@/components/ui";

const STAFF = ["Raka Wibisana", "Indah Larasati"];
const TIMES = ["09.00 – 11.00", "10.00 – 11.30", "13.00 – 14.30", "14.00 – 16.00"];
const AGENDA = ["Pengecekan kondisi tanaman", "Penyiraman dan pemberian nutrisi", "Pembersihan daun dan area pot", "Foto sebelum dan sesudah"];
const nextMonthEnd = () => iso(new Date(TODAY.getFullYear(), TODAY.getMonth() + 2, 0));

/** Cari thread yang berkaitan dengan jadwal sebuah lokasi, untuk pesan otomatis dari tim. */
const visitThread = (d: DB, v: Visit) =>
  d.threads.find((t) => t.locationId === v.locationId && (t.title.startsWith("Audit:") || t.title === "Ubah jadwal kunjungan"))?.id;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/* ---------- Form sheets ---------- */

function ConfirmVisit({ v, onClose }: { v: Visit; onClose: () => void }) {
  const { mut, toast } = useStore();
  const [date, setDate] = useState(v.date);
  const [t, setT] = useState(v.time.includes("–") ? v.time : TIMES[0]);
  const [staff, setStaff] = useState(STAFF[0]);
  return (
    <Sheet onClose={onClose}>
      <h2>Konfirmasi jadwal</h2>
      <Field label="Tanggal">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Jam">
        <select className="select" value={t} onChange={(e) => setT(e.target.value)}>
          {TIMES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Petugas">
        <select className="select" value={staff} onChange={(e) => setStaff(e.target.value)}>
          {STAFF.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <button
        className="btn primary"
        onClick={() => {
          mut((d) => {
            const x = d.visits.find((i) => i.id === v.id)!;
            Object.assign(x, { date, time: t, staff, status: "Terjadwal", resched: undefined });
            const tid = visitThread(d, x);
            if (tid) pushMsg(d, tid, { from: "team", text: `Jadwal dikonfirmasi: ${fmt(date, { weekday: "long", day: "numeric", month: "long" })}, ${t}. Petugas: ${staff}.` }, "team");
          });
          toast("Jadwal dikonfirmasi");
          onClose();
        }}
      >
        Konfirmasi
      </button>
    </Sheet>
  );
}

function CompleteVisit({ v, onClose }: { v: Visit; onClose: () => void }) {
  const { mut, toast } = useStore();
  const [note, setNote] = useState("");
  const [acts, setActs] = useState<string[]>(v.type === "Audit lokasi" ? ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"] : AGENDA.slice(0, 3));
  return (
    <Sheet onClose={onClose}>
      <h2>Selesaikan kunjungan</h2>
      <div className="chips" style={{ margin: 0, padding: 0, flexWrap: "wrap" }}>
        {[...(v.type === "Audit lokasi" ? ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"] : AGENDA)].map((a) => (
          <button key={a} type="button" className={`chip ${acts.includes(a) ? "on" : ""}`} onClick={() => setActs(acts.includes(a) ? acts.filter((x) => x !== a) : [...acts, a])}>
            {a}
          </button>
        ))}
      </div>
      <Field label="Catatan petugas">
        <textarea className="area" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Temuan dan tindak lanjut" />
      </Field>
      <button
        className="btn primary"
        disabled={!note.trim()}
        onClick={() => {
          mut((d) => {
            const x = d.visits.find((i) => i.id === v.id)!;
            const ps = d.plants.filter((p) => p.locationId === x.locationId);
            x.status = "Selesai";
            x.report = {
              id: "RPT-" + uid().toUpperCase().slice(0, 4),
              sehat: ps.filter((p) => p.status === "Sehat").length,
              perhatian: ps.filter((p) => p.status === "Perlu perhatian").length,
              rawat: ps.filter((p) => p.status === "Dalam perawatan").length,
              acts,
              note: note.trim(),
            };
            ps.forEach((p) => (p.lastCare = fmt(x.date)));
            const tid = visitThread(d, x) ?? "tim";
            pushMsg(d, tid, { from: "team", text: `Laporan ${x.report.id} untuk kunjungan ${fmt(x.date)} sudah tersedia di menu Kunjungan.` }, "team");
          });
          toast("Kunjungan diselesaikan");
          onClose();
        }}
      >
        Simpan laporan
      </button>
    </Sheet>
  );
}

function AddPlant({ locationId, onClose }: { locationId: string; onClose: () => void }) {
  const { mut, toast } = useStore();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [status, setStatus] = useState<PlantStatus>("Sehat");
  const [img, setImg] = useState<string>();
  return (
    <Sheet onClose={onClose}>
      <h2>Tambah tanaman</h2>
      <Field label="Nama">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Area">
        <input className="input" value={area} onChange={(e) => setArea(e.target.value)} />
      </Field>
      <Field label="Kondisi">
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as PlantStatus)}>
          {PLANT_STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Foto (opsional)">
        <input type="file" accept="image/*" onChange={async (e) => e.target.files?.[0] && setImg(await fileToDataUrl(e.target.files[0]))} />
      </Field>
      <button
        className="btn primary"
        disabled={!name.trim() || !area.trim()}
        onClick={() => {
          mut((d) =>
            void d.plants.push({
              id: "p-" + uid(),
              locationId,
              name: name.trim(),
              area: area.trim(),
              status,
              image: img,
              history: [{ date: fmt(TODAY, { day: "numeric", month: "short", year: "numeric" }), title: "Dicatat tim", text: "Ditambahkan saat audit.", by: "Tim LESTARI" }],
            } as Plant),
          );
          toast("Tanaman ditambahkan");
          onClose();
        }}
      >
        Simpan
      </button>
    </Sheet>
  );
}

function ScheduleVisit({ locationId, onClose }: { locationId: string; onClose: () => void }) {
  const { mut, toast } = useStore();
  const [date, setDate] = useState("2026-11-21");
  const [t, setT] = useState(TIMES[0]);
  const [staff, setStaff] = useState(STAFF[0]);
  const [type, setType] = useState<(typeof SERVICE_TYPES)[number]>("Perawatan rutin");
  return (
    <Sheet onClose={onClose}>
      <h2>Jadwalkan kunjungan</h2>
      <Field label="Jenis">
        <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          {SERVICE_TYPES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Tanggal">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Jam">
        <select className="select" value={t} onChange={(e) => setT(e.target.value)}>
          {TIMES.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <Field label="Petugas">
        <select className="select" value={staff} onChange={(e) => setStaff(e.target.value)}>
          {STAFF.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </Field>
      <button
        className="btn primary"
        onClick={() => {
          mut((d) => {
            d.visits.push({ id: "v" + uid(), locationId, date, time: t, type, staff, status: "Terjadwal", agenda: AGENDA });
            pushMsg(d, "tim", { from: "team", text: `Kunjungan ${type.toLowerCase()} dijadwalkan ${fmt(date, { weekday: "long", day: "numeric", month: "long" })}, ${t}.` }, "team");
          });
          toast("Kunjungan dijadwalkan");
          onClose();
        }}
      >
        Jadwalkan
      </button>
    </Sheet>
  );
}

function Quote({ locationId, onClose }: { locationId: string; onClose: () => void }) {
  const { db, mut, toast } = useStore();
  const plants = db.plants.filter((p) => p.locationId === locationId);
  const [pid, setPid] = useState(plants[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <Sheet onClose={onClose}>
      <h2>Buat penawaran biaya</h2>
      <Field label="Tanaman terkait">
        <select className="select" value={pid} onChange={(e) => setPid(e.target.value)}>
          {plants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Judul">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Penggantian monstera" />
      </Field>
      <Field label="Penjelasan untuk pelanggan">
        <textarea className="area" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <Field label="Biaya (Rp)">
        <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <button
        className="btn primary"
        disabled={!title.trim() || !amount}
        onClick={() => {
          mut((d) => {
            const loc = d.locations.find((l) => l.id === locationId);
            const tid = "t" + uid();
            d.threads.unshift({
              id: tid,
              locationId,
              title: title.trim(),
              sub: `${loc?.name ?? ""} · persetujuan biaya`,
              unread: 1,
              adminUnread: 0,
              acked: true,
              msgs: [{ id: uid(), from: "team", text: `${reason.trim()} Estimasi ${idr(Number(amount))}.`, at: "Baru saja" }],
            });
            d.approvals.unshift({ id: "ap-" + uid(), locationId, plantId: pid || undefined, title: title.trim(), reason: reason.trim(), amount: Number(amount), status: "Menunggu keputusan", createdAt: iso(TODAY), threadId: tid });
          });
          toast("Penawaran dikirim");
          onClose();
        }}
      >
        Kirim penawaran
      </button>
    </Sheet>
  );
}

function NewInvoice({ locationId, onClose }: { locationId: string; onClose: () => void }) {
  const { mut, toast } = useStore();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <Sheet onClose={onClose}>
      <h2>Buat tagihan</h2>
      <Field label="Judul">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Jumlah (Rp)">
        <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      </Field>
      <button
        className="btn primary"
        disabled={!title.trim() || !amount}
        onClick={() => {
          mut((d) => void d.invoices.unshift({ id: "INV-" + uid().toUpperCase().slice(0, 4), locationId, title: title.trim(), amount: Number(amount), due: iso(new Date(TODAY.getTime() + 7 * 864e5)), status: "Belum dibayar" }));
          toast("Tagihan dibuat");
          onClose();
        }}
      >
        Buat tagihan
      </button>
    </Sheet>
  );
}

/* ---------- Halaman ---------- */

const BREAKEVEN = 10; // klien berbayar (titik impas di docs Milestone 2)
const BAR: Record<string, string> = { Sehat: "ok", "Perlu perhatian": "warn", "Dalam perawatan": "care", "Belum dicek": "mute" };
const jt = (n: number) => (n === 0 ? "0" : n >= 1e6 ? `Rp${(n / 1e6).toFixed(1).replace(".", ",")} jt` : `Rp${Math.round(n / 1e3)} rb`);

type Preset = "3b" | "6b" | "yr" | "custom";
const PRESETS: [Preset, string][] = [["3b", "3 bulan"], ["6b", "6 bulan"], ["yr", "Tahun ini"], ["custom", "Pilih tanggal"]];
const startOf = (monthsBack: number) => iso(new Date(TODAY.getFullYear(), TODAY.getMonth() - monthsBack, 1));
const dayAdd = (isoDate: string, n: number) => iso(new Date(day(isoDate).getTime() + n * 864e5));

function Overview() {
  const { db } = useStore();
  const [preset, setPreset] = useState<Preset>("yr");
  const [open, setOpen] = useState(false);
  const [cFrom, setCFrom] = useState(startOf(2));
  const [cTo, setCTo] = useState(iso(TODAY));
  const from = preset === "3b" ? startOf(2) : preset === "6b" ? startOf(5) : preset === "yr" ? `${TODAY.getFullYear()}-01-01` : cFrom;
  const to = preset === "custom" ? cTo : iso(TODAY);
  const valid = from <= to;

  const paid = db.invoices.filter((i) => i.status === "Lunas" && i.paidAt);
  const sum = (a: string, b: string) => paid.filter((i) => i.paidAt! >= a && i.paidAt! <= b).reduce((n, i) => n + i.amount, 0);
  const months: Date[] = [];
  if (valid) for (let m = new Date(day(from).getFullYear(), day(from).getMonth(), 1); m <= day(to); m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m);
  const rows = months.map((m) => {
    const a = iso(m) > from ? iso(m) : from;
    const e = iso(new Date(m.getFullYear(), m.getMonth() + 1, 0));
    return { m, total: sum(a, e < to ? e : to) };
  });
  const total = valid ? sum(from, to) : 0;
  const len = valid ? Math.round((day(to).getTime() - day(from).getTime()) / 864e5) + 1 : 0;
  const prev = valid ? sum(dayAdd(from, -len), dayAdd(from, -1)) : 0;
  const delta = prev > 0 ? Math.round(((total - prev) / prev) * 100) : null;
  const max = Math.max(1, ...rows.map((r) => r.total));

  const unpaid = db.invoices.filter((i) => i.status === "Belum dibayar");
  const active = db.plans.filter((p) => p.status === "Aktif");
  const paying = new Set(db.locations.filter((l) => active.some((p) => p.locationId === l.id)).map((l) => l.accountId)).size;
  const prospects = db.accounts.filter((a) => {
    const ids = db.locations.filter((l) => l.accountId === a.id).map((l) => l.id);
    return stageOf(db, ids) !== "Paket aktif";
  }).length;
  const mrr = active.reduce((n, p) => n + planOf(p.planId).price, 0);
  const week = db.visits.filter((v) => v.status !== "Selesai" && v.date <= iso(new Date(TODAY.getTime() + 7 * 864e5)));
  const counts = PLANT_STATUS.map((s) => ({ s, n: db.plants.filter((p) => p.status === s).length }));
  const stats: [string, string][] = [
    ["Pendapatan berulang per bulan", idr(mrr)],
    ["Belum dibayar", idr(unpaid.reduce((n, i) => n + i.amount, 0))],
    ["Kunjungan 7 hari ke depan", String(week.length)],
  ];
  const need = Math.max(0, BREAKEVEN - paying);
  return (
    <>
      <h1 className="adm-h1">Ringkasan</h1>
      <div className="stats">
        {stats.map(([k, v]) => (
          <div className="card" key={k}>
            <p className="sub">{k}</p>
            <p className="big num">{v}</p>
          </div>
        ))}
      </div>
      <div className="ov">
        <div className="ov-main">
          <div className="card">
            <div className="adm-head" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <p className="sub">Pendapatan, tagihan lunas</p>
                <p className="num" style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>
                  {idr(total)}
                </p>
                <p className="sub" style={{ marginTop: 4 }}>
                  {fmt(from, { day: "numeric", month: "short", year: "numeric" })} – {fmt(to, { day: "numeric", month: "short", year: "numeric" })}
                  {delta !== null && ` · ${delta >= 0 ? "naik" : "turun"} ${Math.abs(delta)}% dari periode sebelumnya`}
                </p>
              </div>
              <button className="btn sm acc" aria-expanded={open} onClick={() => setOpen(!open)}>
                {PRESETS.find(([k]) => k === preset)![1]}
                <ChevronDown {...ic} />
              </button>
            </div>
            {open && (
              <div className="acc-panel">
                {PRESETS.map(([k, label]) => (
                  <button
                    key={k}
                    className={preset === k ? "on" : ""}
                    onClick={() => {
                      setPreset(k);
                      if (k !== "custom") setOpen(false);
                    }}
                  >
                    {label}
                    {preset === k && <Check {...ic} />}
                  </button>
                ))}
                {preset === "custom" && (
                  <div className="date-range">
                    <input className="input sm" type="date" value={cFrom} max={cTo} onChange={(e) => setCFrom(e.target.value)} aria-label="Dari tanggal" />
                    <span className="sub">sampai</span>
                    <input className="input sm" type="date" value={cTo} min={cFrom} max={iso(TODAY)} onChange={(e) => setCTo(e.target.value)} aria-label="Sampai tanggal" />
                  </div>
                )}
              </div>
            )}
            {rows.length === 0 ? (
              <p className="empty">Rentang tanggal tidak valid.</p>
            ) : (
              <div className="chart" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
                {rows.map((r, k) => (
                  <div key={k} className={k === rows.length - 1 ? "col last" : "col"}>
                    <span className="num v">{jt(r.total)}</span>
                    <div className="well">
                      <i className={k === rows.length - 1 ? "now" : ""} style={{ height: `${Math.max(r.total ? 4 : 0, (r.total / max) * 100)}%` }} />
                    </div>
                    <span className="sub">{fmt(r.m, { month: "short" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="adm-two">
            <div className="card">
              <p className="sub">Menuju titik impas</p>
              <p className="big num">
                {paying} <span className="t2" style={{ fontSize: 17, fontWeight: 400 }}>dari {BREAKEVEN} klien berbayar</span>
              </p>
              <div className="bar" style={{ margin: "12px 0" }}>
                <i style={{ width: `${Math.min(100, (paying / BREAKEVEN) * 100)}%` }} />
              </div>
              <p className="t2">{need === 0 ? "Titik impas tercapai." : `Butuh ${need} klien lagi. ${prospects} calon klien sedang diproses.`}</p>
              {need > 0 && (
                <button className="btn sm primary" style={{ marginTop: 12 }} onClick={() => go("/admin/clients/prospects")}>
                  Lihat calon klien
                </button>
              )}
            </div>
            <div className="card">
              <p className="sub">Kondisi {db.plants.length} tanaman · {counts[1].n} perlu perhatian</p>
              <div className="stackbar" style={{ margin: "12px 0" }}>
                {counts
                  .filter((c) => c.n > 0)
                  .map((c) => (
                    <i key={c.s} className={`s-${BAR[c.s]}`} style={{ flex: c.n }} title={`${c.s}: ${c.n}`} />
                  ))}
              </div>
              <div className="legend">
                {counts.map((c) => (
                  <span key={c.s} className={`st st-${BAR[c.s]}`}>
                    <i />
                    {c.s} <span className="num">{c.n}</span>
                  </span>
                ))}
              </div>
              <button className="btn sm" style={{ marginTop: 12 }} onClick={() => go("/admin/plants")}>
                Lihat tanaman
              </button>
            </div>
          </div>
        </div>
        <div className="ov-side">
          <h2 className="h2" style={{ marginTop: 0 }}>
            Antrean tindakan
          </h2>
          <Queue limit={4} />
        </div>
      </div>
    </>
  );
}

function Queue({ limit }: { limit?: number }) {
  const { db } = useStore();
  const [sheet, setSheet] = useState<ReactNode>(null);
  const close = () => setSheet(null);
  const lname = (id: string) => db.locations.find((l) => l.id === id)?.name ?? "";
  const confirm = db.visits.filter((v) => v.status === "Menunggu konfirmasi");
  const activate = db.plans
    .filter((p) => p.status === "Menunggu audit" && db.visits.some((v) => v.locationId === p.locationId && v.type === "Audit lokasi" && v.status === "Selesai"));
  const unread = db.threads.filter((t) => t.adminUnread > 0);
  const soon = iso(new Date(TODAY.getTime() + 60 * 864e5));
  const renewals = db.plans.filter((p) => p.status === "Aktif" && p.until && p.until <= soon);
  const empty = !confirm.length && !activate.length && !unread.length && !renewals.length;
  const all = [
        ...confirm.map((v) => (
          <div key={v.id}>
            <span className="body">
              <strong>{v.type} menunggu konfirmasi</strong>
              <span className="sub">
                {lname(v.locationId)} · usulan {v.resched ?? fmt(v.date)}
              </span>
            </span>
            <button className="btn primary sm" onClick={() => setSheet(<ConfirmVisit v={v} onClose={close} />)}>
              Konfirmasi
            </button>
          </div>
        )),
        ...activate.map((p) => (
          <div key={p.locationId}>
            <span className="body">
              <strong>Audit selesai, aktifkan paket</strong>
              <span className="sub">{lname(p.locationId)}</span>
            </span>
            <ActivateBtn locationId={p.locationId} />
          </div>
        )),
        ...renewals.map((p) => (
          <div key={"r" + p.locationId}>
            <span className="body">
              <strong>Paket segera berakhir</strong>
              <span className="sub">
                {lname(p.locationId)} · sampai {fmt(p.until!, { day: "numeric", month: "long" })}
              </span>
            </span>
            <RemindBtn locationId={p.locationId} until={p.until!} />
          </div>
        )),
        ...unread.map((t) => (
          <div key={t.id}>
            <span className="body">
              <strong>Pesan belum dibalas</strong>
              <span className="sub">{t.title}</span>
            </span>
            <button className="btn sm" onClick={() => go(`/admin/messages/${t.id}`)}>
              Balas
            </button>
          </div>
        )),
  ];
  return (
    <>
      {empty && <p className="card t2">Tidak ada yang menunggu tindakan.</p>}
      <div className="list">
        {(limit ? all.slice(0, limit) : all)}
      </div>
      {limit && all.length > limit && (
        <button className="btn sm" style={{ marginTop: 12 }} onClick={() => go("/admin/queue")}>
          Lihat semua
        </button>
      )}
      {sheet}
    </>
  );
}

function RemindBtn({ locationId, until }: { locationId: string; until: string }) {
  const { mut, toast, db } = useStore();
  return (
    <button
      className="btn sm"
      onClick={() => {
        const loc = db.locations.find((l) => l.id === locationId);
        mut((d) => {
          if (loc?.accountId === d.me) pushMsg(d, "tim", { from: "team", text: `Paket ${loc.name} berakhir ${fmt(until, { day: "numeric", month: "long" })}. Perpanjang kapan saja di menu Paket dan tagihan.` }, "team");
        });
        toast("Pengingat terkirim");
      }}
    >
      Kirim pengingat
    </button>
  );
}

function ActivateBtn({ locationId }: { locationId: string }) {
  const { mut, toast } = useStore();
  return (
    <button
      className="btn primary sm"
      onClick={() => {
        mut((d) => {
          const p = d.plans.find((x) => x.locationId === locationId)!;
          p.status = "Aktif";
          p.until = nextMonthEnd();
          const loc = d.locations.find((l) => l.id === locationId);
          d.invoices.unshift({ id: "INV-" + uid().toUpperCase().slice(0, 4), locationId, title: `Care Basic ${loc?.name ?? ""}, ${fmt(TODAY, { month: "long", year: "numeric" })}`, amount: planOf(p.planId).price, due: iso(new Date(TODAY.getTime() + 7 * 864e5)), status: "Belum dibayar" });
          const tid = d.threads.find((t) => t.locationId === locationId)?.id ?? "tim";
          pushMsg(d, tid, { from: "team", text: "Paket Care Basic sudah aktif. Tagihan bulan pertama tersedia di menu Paket dan tagihan, dan kunjungan rutin akan dijadwalkan." }, "team");
        });
        toast("Paket diaktifkan");
      }}
    >
      Aktifkan paket
    </button>
  );
}

/** Tahap klien di alur: daftar → audit → aktif. */
function stageOf(db: DB, locIds: string[]) {
  if (locIds.length === 0) return "Baru mendaftar";
  const plans = db.plans.filter((p) => locIds.includes(p.locationId));
  if (plans.every((p) => p.status === "Aktif")) return "Paket aktif";
  const audits = db.visits.filter((v) => locIds.includes(v.locationId) && v.type === "Audit lokasi");
  if (audits.some((v) => v.status === "Selesai")) return "Audit selesai, siap aktivasi";
  if (audits.some((v) => v.status === "Terjadwal")) return "Audit dijadwalkan";
  return "Audit diajukan";
}

function Clients({ filter }: { filter?: string }) {
  const { db } = useStore();
  const [f, setF] = useState<"all" | "prospect" | "active">(filter === "prospects" ? "prospect" : "all");
  const [q, setQ] = useState("");
  const rows = db.accounts
    .map((a) => {
      const locs = db.locations.filter((l) => l.accountId === a.id);
      const ids = locs.map((l) => l.id);
      return { a, locs, ids, stage: stageOf(db, ids) };
    })
    .filter((r) => (f === "all" ? true : f === "active" ? r.stage === "Paket aktif" : r.stage !== "Paket aktif"))
    .filter((r) => `${r.a.name} ${r.a.email} ${r.locs.map((l) => l.name).join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <h1 className="adm-h1">Klien</h1>
      <div className="adm-filter" style={{ marginBottom: 16 }}>
        <div className="seg" style={{ margin: 0 }} role="tablist">
          {(
            [
              ["all", "Semua"],
              ["prospect", "Calon klien"],
              ["active", "Paket aktif"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} role="tab" className={f === k ? "on" : ""} onClick={() => setF(k)}>
              {label}
            </button>
          ))}
        </div>
        <input className="input sm" style={{ maxWidth: 280 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari klien atau lokasi" aria-label="Cari klien" />
      </div>
      {rows.length === 0 && <p className="card t2">Tidak ada klien yang cocok.</p>}
      {rows.length > 0 && (
        <Table head={["Klien", "Lokasi", "Tanaman", "Tahap"]}>
          {rows.map(({ a, locs, ids, stage }) => (
            <tr key={a.id} onClick={() => go(`/admin/client/${a.id}`)}>
              <td>
                <strong>{a.name || "Nama belum diisi"}</strong>
                <br />
                <span className="sub">{a.email}</span>
              </td>
              <td>{locs.map((l) => l.name).join(", ") || "Belum ada"}</td>
              <td className="num">{db.plants.filter((p) => ids.includes(p.locationId)).length}</td>
              <td>{stage}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function PlantsAttention() {
  const { db } = useStore();
  const rows = db.plants
    .filter((p) => p.status !== "Sehat")
    .map((p) => {
      const loc = db.locations.find((l) => l.id === p.locationId);
      return { p, loc, acc: db.accounts.find((a) => a.id === loc?.accountId) };
    });
  return (
    <>
      <button className="btn quiet sm" style={{ width: "auto", padding: 0 }} onClick={() => go("/admin")}>
        Ringkasan
      </button>
      <h1 className="adm-h1">Tanaman yang perlu ditindaklanjuti</h1>
      {rows.length === 0 && <p className="card t2">Semua tanaman sehat.</p>}
      {rows.length > 0 && (
        <Table head={["Tanaman", "Lokasi", "Kondisi", ""]}>
          {rows.map(({ p, loc, acc }) => (
            <tr key={p.id}>
              <td>
                <strong>{p.name}</strong>
                <br />
                <span className="sub">{p.area}</span>
              </td>
              <td>{loc?.name}</td>
              <td>
                <Status label={p.status} />
              </td>
              <td>
                {acc && (
                  <button className="btn sm" onClick={() => go(`/admin/client/${acc.id}`)}>
                    Buka klien
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

function Client({ id }: { id: string }) {
  const { db, mut, toast } = useStore();
  const acc = db.accounts.find((a) => a.id === id);
  const locs = db.locations.filter((l) => l.accountId === id);
  const [li, setLi] = useState(0);
  const [sheet, setSheet] = useState<ReactNode>(null);
  const close = () => setSheet(null);
  if (!acc) return <p className="empty">Klien tidak ditemukan.</p>;
  const loc = locs[li] ?? locs[0];
  const plan = loc && db.plans.find((p) => p.locationId === loc.id);
  const plants = loc ? db.plants.filter((p) => p.locationId === loc.id) : [];
  const visits = loc ? db.visits.filter((v) => v.locationId === loc.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const apps = loc ? db.approvals.filter((a) => a.locationId === loc.id) : [];
  const inv = loc ? db.invoices.filter((i) => i.locationId === loc.id) : [];
  return (
    <>
      <button className="btn quiet sm" style={{ width: "auto", padding: 0 }} onClick={() => go("/admin/clients")}>
        Semua klien
      </button>
      <h1 className="adm-h1">{acc.name || "Nama belum diisi"}</h1>
      <p className="sub">{acc.email}</p>
      {locs.length === 0 ? (
        <p className="card t2" style={{ marginTop: 16 }}>
          Klien ini belum mendaftarkan lokasi.
        </p>
      ) : (
        <>
          <div className="chips" style={{ margin: "16px 0", padding: 0 }}>
            {locs.map((l, i) => (
              <button key={l.id} className={`chip ${i === li ? "on" : ""}`} onClick={() => setLi(i)}>
                {l.name}
              </button>
            ))}
          </div>
          <p className="t2">
            {loc.type} · {loc.address}
          </p>

          <h2 className="h2">Paket</h2>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1 }}>
              {plan?.status === "Aktif" ? `${planOf(plan.planId).name}, aktif sampai ${fmt(plan.until!, { day: "numeric", month: "long", year: "numeric" })}` : "Menunggu audit"}
            </span>
            {plan?.status !== "Aktif" && <ActivateBtn locationId={loc.id} />}
          </div>

          <div className="adm-head">
            <h2 className="h2">Tanaman ({plants.length})</h2>
            <button className="btn sm" onClick={() => setSheet(<AddPlant locationId={loc.id} onClose={close} />)}>
              Tambah tanaman
            </button>
          </div>
          <Table head={["Tanaman", "Area", "Kondisi"]}>
            {plants.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.area}</td>
                <td>
                  <select
                    className="select sm"
                    value={p.status}
                    onChange={(e) => mut((d) => void (d.plants.find((x) => x.id === p.id)!.status = e.target.value as PlantStatus))}
                  >
                    {PLANT_STATUS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </Table>

          <div className="adm-head">
            <h2 className="h2">Kunjungan</h2>
            <button className="btn sm" onClick={() => setSheet(<ScheduleVisit locationId={loc.id} onClose={close} />)}>
              Jadwalkan
            </button>
          </div>
          <Table head={["Tanggal", "Jenis", "Petugas", "Status", ""]}>
            {visits.map((v) => (
              <tr key={v.id}>
                <td className="num">{fmt(v.date)}</td>
                <td>{v.type}</td>
                <td>{v.staff}</td>
                <td>
                  <Status label={v.status} />
                </td>
                <td>
                  {v.status === "Menunggu konfirmasi" && (
                    <button className="btn sm primary" onClick={() => setSheet(<ConfirmVisit v={v} onClose={close} />)}>
                      Konfirmasi
                    </button>
                  )}
                  {v.status === "Terjadwal" && (
                    <button className="btn sm" onClick={() => setSheet(<CompleteVisit v={v} onClose={close} />)}>
                      Selesaikan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>

          <div className="adm-head">
            <h2 className="h2">Penawaran biaya</h2>
            <button className="btn sm" disabled={plants.length === 0} onClick={() => setSheet(<Quote locationId={loc.id} onClose={close} />)}>
              Buat penawaran
            </button>
          </div>
          <Table head={["Judul", "Biaya", "Status"]}>
            {apps.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td className="num">{idr(a.amount)}</td>
                <td>
                  <Status label={a.status} />
                </td>
              </tr>
            ))}
          </Table>

          <div className="adm-head">
            <h2 className="h2">Tagihan</h2>
            <button className="btn sm" onClick={() => setSheet(<NewInvoice locationId={loc.id} onClose={close} />)}>
              Buat tagihan
            </button>
          </div>
          <Table head={["Tagihan", "Jumlah", "Status", ""]}>
            {inv.map((i) => (
              <tr key={i.id}>
                <td>{i.title}</td>
                <td className="num">{idr(i.amount)}</td>
                <td>
                  <Status label={i.status} />
                </td>
                <td>
                  {i.status === "Belum dibayar" && (
                    <button
                      className="btn sm"
                      onClick={() => {
                        mut((d) => {
                          const x = d.invoices.find((y) => y.id === i.id)!;
                          x.status = "Lunas";
                          x.paidAt = iso(TODAY);
                          x.method = "Dikonfirmasi admin";
                        });
                        toast("Ditandai lunas");
                      }}
                    >
                      <Check {...ic} />
                      Tandai lunas
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </>
      )}
      {sheet}
    </>
  );
}

function Schedule() {
  const { db } = useStore();
  const [sheet, setSheet] = useState<ReactNode>(null);
  const list = db.visits.filter((v) => v.status !== "Selesai").sort((a, b) => a.date.localeCompare(b.date));
  const days = [...new Set(list.map((v) => v.date))];
  const lname = (id: string) => db.locations.find((l) => l.id === id)?.name ?? "";
  return (
    <>
      <h1 className="adm-h1">Jadwal</h1>
      {days.length === 0 && <p className="card t2">Belum ada kunjungan mendatang.</p>}
      {days.map((d) => (
        <div key={d}>
          <h2 className="h2">{fmt(d, { weekday: "long", day: "numeric", month: "long" })}</h2>
          <div className="list">
            {list
              .filter((v) => v.date === d)
              .map((v) => (
                <div key={v.id}>
                  <span className="body">
                    <strong>
                      {lname(v.locationId)} · {v.type}
                    </strong>
                    <span className="sub">
                      {v.time} · {v.staff}
                    </span>
                  </span>
                  <Status label={v.status} />
                  {v.status === "Menunggu konfirmasi" && (
                    <button className="btn sm primary" onClick={() => setSheet(<ConfirmVisit v={v} onClose={() => setSheet(null)} />)}>
                      Konfirmasi
                    </button>
                  )}
                  {v.status === "Terjadwal" && (
                    <button className="btn sm" onClick={() => setSheet(<CompleteVisit v={v} onClose={() => setSheet(null)} />)}>
                      Selesaikan
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
      {sheet}
    </>
  );
}

function Messages({ id }: { id?: string }) {
  const { db, mut } = useStore();
  const [text, setText] = useState("");
  const t = db.threads.find((x) => x.id === id) ?? db.threads[0];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !t) return;
    mut((d) => {
      pushMsg(d, t.id, { from: "team", text: text.trim() }, "team");
      d.threads.find((x) => x.id === t.id)!.adminUnread = 0;
    });
    setText("");
  };
  return (
    <>
      <h1 className="adm-h1">Pesan</h1>
      <div className="msg-grid">
        <div className="list">
          {db.threads.map((x) => (
            <button key={x.id} onClick={() => go(`/admin/messages/${x.id}`)} style={x.id === t?.id ? { background: "var(--raised)" } : undefined}>
              <span className="body">
                <strong className="clamp">{x.title}</strong>
                <span className="sub clamp">{x.sub}</span>
              </span>
              {x.adminUnread > 0 && (
                <span className="st st-warn">
                  <i />
                </span>
              )}
            </button>
          ))}
        </div>
        {t && (
          <div className="card">
            <h2 style={{ fontSize: 17, marginBottom: 12 }}>{t.title}</h2>
            <div className="chat">
              {t.msgs.map((m) => (
                <div key={m.id} className={`bubble ${m.from === "team" ? "me" : ""}`}>
                  {m.img && <img src={m.img} alt="Foto dari pelanggan" />}
                  {m.text}
                  <small>{m.at}</small>
                </div>
              ))}
            </div>
            <form onSubmit={submit} style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Balas sebagai tim LESTARI" />
              <button className="btn primary" style={{ width: "auto" }}>
                <Send {...ic} />
                Kirim
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export function Admin({ path }: { path: string }) {
  const { db, reset } = useStore();
  const [, , sub = "", id] = path.split("/");
  const nav = [
    { to: "/admin", label: "Ringkasan", icon: LayoutDashboard, on: sub === "" },
    { to: "/admin/queue", label: "Antrean", icon: Inbox, on: sub === "queue" },
    { to: "/admin/schedule", label: "Jadwal", icon: CalendarDays, on: sub === "schedule" },
    { to: "/admin/clients", label: "Klien", icon: Users, on: sub === "clients" || sub === "client" },
    { to: "/admin/messages", label: "Pesan", icon: Send, on: sub === "messages" },
  ];
  const unread = db.threads.reduce((n, t) => n + t.adminUnread, 0);
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="brand" style={{ marginBottom: 24 }}>
          LESTARI <span className="sub">Admin</span>
        </div>
        {nav.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.to} className={n.on ? "on" : ""} onClick={() => swap(n.to)}>
              <Icon {...ic} />
              {n.label}
              {n.label === "Pesan" && unread > 0 && <span className="st st-warn"><i /></span>}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button onClick={() => window.open("#/", "_blank")} title="Buka app pelanggan di tab baru">
          <ExternalLink {...ic} />
          <span className="clamp">App pelanggan</span>
        </button>
        <button onClick={() => reset(db.scenario)}>
          <RotateCcw {...ic} />
          <span className="clamp">Atur ulang data</span>
        </button>
        <button onClick={() => swap(auth.mode() !== "none" ? "/" : "/login")} title="Keluar dari dashboard ke mode pelanggan">
          <LogOut {...ic} />
          <span className="clamp">Mode pelanggan</span>
        </button>
      </aside>
      <main className="adm-main">
        {sub === "" && <Overview />}
        {sub === "queue" && (
          <>
            <h1 className="adm-h1">Antrean</h1>
            <Queue />
          </>
        )}
        {sub === "schedule" && <Schedule />}
        {sub === "clients" && <Clients key={id} filter={id} />}
        {sub === "plants" && <PlantsAttention />}
        {sub === "client" && <Client id={id} />}
        {sub === "messages" && <Messages id={id} />}
      </main>
    </div>
  );
}
