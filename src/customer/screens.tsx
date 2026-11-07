import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileText,
  Leaf,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  User,
  X,
} from "lucide-react";
import { DB, Plant, PLANT_STATUS, fmt, idr } from "@/lib/data";
import { auth, back, go, onboarded, returnTo, swap } from "@/lib/router";
import { fileToDataUrl, useStore } from "@/lib/store";
import { GoogleG, Head, ScopePill, SlotPicker, Status, Thumb, ic, share } from "@/components/ui";

/* ---------- Masuk dan pengenalan ---------- */

const WHY: [RegExp, string][] = [
  [/^\/location\/new/, "mendaftarkan lokasi"],
  [/^\/plant\/new/, "menambah tanaman"],
  [/^\/report/, "melapor masalah"],
  [/^\/thread\//, "mengirim pesan"],
  [/^\/pay\//, "membayar"],
  [/^\/renew\//, "memperpanjang paket"],
];

export function Login() {
  const { reset, db } = useStore();
  const [busy, setBusy] = useState(false);
  const [sc, setSc] = useState<DB["scenario"]>("jalan");
  const rt = returnTo.peek(); // ada = tamu menekan aksi komitmen
  const why = rt ? WHY.find(([r]) => r.test(rt))?.[1] : undefined;
  const mode = auth.mode();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      if (!rt) reset(sc); // login biasa: pilih skenario demo. Dari gerbang: pertahankan data tamu.
      auth.set(true);
      const named = rt ? !!db.accounts.find((a) => a.id === db.me)?.name : sc === "jalan";
      if (rt && named) swap(returnTo.take() ?? "/");
      else swap(named ? "/" : "/setup");
    }, 700);
  };
  return (
    <main className="screen bare">
      <form className="center" onSubmit={submit}>
        <div className="brand">
          <span className="mark">
            <Leaf {...ic} />
          </span>
          LESTARI
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="hero-title">{rt ? "Masuk untuk melanjutkan" : "Masuk ke akun usaha Anda"}</h1>
          <p className="t2">
            {rt
              ? `Masuk dengan Google untuk ${why ?? "melanjutkan"}. Anda kembali ke langkah ini setelah masuk.`
              : "Jadwal, laporan, tagihan, dan pesan perawatan tanaman di satu tempat."}
          </p>
        </div>
        <div className="stack">
          <button className="btn google" disabled={busy}>
            <GoogleG />
            {busy ? "Menghubungkan…" : "Masuk Google"}
          </button>
          {rt ? (
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                returnTo.take();
                swap("/");
              }}
            >
              Batal
            </button>
          ) : (
            mode === "none" && (
              <button
                type="button"
                className="btn quiet"
                onClick={() => {
                  reset("baru");
                  auth.guest();
                  swap(onboarded.get() ? "/" : "/welcome");
                }}
              >
                Lewati dulu
              </button>
            )
          )}
        </div>
        {!rt && (
          <div className="demo-switch">
            <p className="sub">Mode demo untuk tombol Google</p>
            <div className="seg" style={{ margin: 0 }} role="tablist">
              <button type="button" role="tab" className={sc === "baru" ? "on" : ""} onClick={() => setSc("baru")}>
                Akun baru
              </button>
              <button type="button" role="tab" className={sc === "jalan" ? "on" : ""} onClick={() => setSc("jalan")}>
                Sudah berjalan
              </button>
            </div>
            <button type="button" className="btn quiet" style={{ minHeight: 40 }} onClick={() => swap("/admin")}>
              Buka admin
            </button>
          </div>
        )}
      </form>
    </main>
  );
}

const slides = [
  { icon: MapPin, title: "Daftarkan lokasi Anda", text: "Café, kantor, atau rumah. Satu akun bisa punya banyak lokasi." },
  { icon: CalendarDays, title: "Audit lalu perawatan terjadwal", text: "Tim mengaudit dan mencatat tanaman, lalu datang sesuai jadwal dengan laporan foto." },
  { icon: FileText, title: "Biaya tambahan Anda yang putuskan", text: "Tidak ada biaya tanpa persetujuan. Setujui, bayar, dan tanya tim langsung dari app." },
];

export function Onboarding() {
  const [i, setI] = useState(0);
  const last = i === slides.length - 1;
  const Icon = slides[i].icon;
  const done = () => {
    onboarded.set();
    swap("/");
  };
  return (
    <main className="screen bare">
      <div className="onb">
        <button className="skip" onClick={done}>
          Lewati
        </button>
        <div className="mid" key={i} style={{ animation: "rise 220ms var(--ease) both" }}>
          <div className="badge">
            <Icon size={48} strokeWidth={1.25} />
          </div>
          <h1 className="hero-title" style={{ fontSize: 22, lineHeight: "28px" }}>
            {slides[i].title}
          </h1>
          <p>{slides[i].text}</p>
        </div>
        <div className="dots">
          {slides.map((_, n) => (
            <i key={n} className={n === i ? "on" : ""} />
          ))}
        </div>
        <button className="btn primary" onClick={() => (last ? done() : setI(i + 1))}>
          {last ? "Mulai" : "Lanjut"}
        </button>
      </div>
    </main>
  );
}

/* ---------- Komponen bersama ---------- */

export function PlantRow({ p }: { p: Plant }) {
  const { showLoc, locName } = useStore();
  return (
    <button className="row" onClick={() => go(`/plant/${p.id}`)}>
      <Thumb src={p.image} alt={p.name} />
      <div className="body">
        <strong className="clamp">{p.name}</strong>
        <span className="sub clamp">
          {p.area}
          {showLoc ? ` · ${locName(p.locationId)}` : ""}
        </span>
        <Status label={p.status} />
      </div>
      <ChevronRight className="chev" {...ic} />
    </button>
  );
}

const DateBox = ({ date }: { date: string }) => (
  <span className="date-box">
    <strong className="num">{fmt(date, { day: "numeric" })}</strong>
    <span>{fmt(date, { month: "short" })}</span>
  </span>
);

/* ---------- Beranda ---------- */

function HomeEmpty() {
  const { me } = useStore();
  const guest = auth.mode() === "guest";
  return (
    <main className="screen">
      <Head title="Selamat datang" sub={guest ? "Anda belum masuk" : me.name.split(" ")[0] || me.email} />
      <div className="card empty-card" style={{ marginTop: 8 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 22, lineHeight: "28px" }}>Daftarkan lokasi pertama Anda</h2>
          <p className="t2">Setelah itu tim LESTARI datang mengaudit dan perawatan dimulai.</p>
        </div>
        <div className="steps">
          <p>Daftarkan lokasi dan pilih jadwal audit.</p>
          <p>Tim mengaudit dan mencatat tanaman Anda.</p>
          <p>Anda menerima penawaran paket, lalu perawatan rutin berjalan.</p>
        </div>
        <button className="btn primary" onClick={() => go("/location/new")}>
          <Plus {...ic} />
          {guest ? "Masuk dulu" : "Daftarkan lokasi"}
        </button>
        <button className="btn" onClick={() => go("/plans")}>
          Lihat paket
        </button>
        <button className="btn quiet" onClick={() => go("/thread/tim")}>
          Tanya tim
        </button>
      </div>
    </main>
  );
}

export function Home() {
  const s = useStore();
  const { db, myLocations, inScope, showLoc, locName } = s;
  if (myLocations.length === 0) return <HomeEmpty />;

  const approvals = inScope(db.approvals).filter((a) => a.status === "Menunggu keputusan");
  const due = inScope(db.invoices).filter((i) => i.status === "Belum dibayar");
  const next = inScope(db.visits)
    .filter((v) => v.status !== "Selesai")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const plants = inScope(db.plants);
  const attention = plants.filter((p) => p.status === "Perlu perhatian" || p.status === "Dalam perawatan");
  const alert = approvals.length > 0 || due.length > 0 || db.threads.some((t) => t.unread);
  const todo = approvals.length + due.length;

  return (
    <main className="screen">
      <Head
        title="7 November"
        sub={<ScopePill />}
        right={
          <button className="round" onClick={() => go("/notifications")} aria-label="Notifikasi">
            <Bell {...ic} />
            {alert && <span className="dot" />}
          </button>
        }
      />

      <h2 className="h2">Perlu tindakan</h2>
      {todo === 0 ? (
        <p className="card t2">Tidak ada yang perlu Anda putuskan atau bayar.</p>
      ) : (
        <div className="list">
          {approvals.map((a) => (
            <button key={a.id} onClick={() => go(`/approval/${a.id}`)}>
              <span className="icon-box">
                <Leaf {...ic} />
              </span>
              <span className="body">
                <strong className="lines2">Setujui {a.title.toLowerCase()}</strong>
                <span className="sub clamp">
                  {showLoc ? `${locName(a.locationId)} · ` : ""}estimasi {idr(a.amount)}
                </span>
              </span>
              <ChevronRight className="chev" {...ic} />
            </button>
          ))}
          {due.map((i) => (
            <button key={i.id} onClick={() => go(`/pay/${i.id}`)}>
              <span className="icon-box">
                <CreditCard {...ic} />
              </span>
              <span className="body">
                <strong className="lines2">Bayar {i.title}</strong>
                <span className="sub clamp">
                  Jatuh tempo {fmt(i.due)} · {idr(i.amount)}
                </span>
              </span>
              <ChevronRight className="chev" {...ic} />
            </button>
          ))}
        </div>
      )}

      <h2 className="h2">Kunjungan berikutnya</h2>
      {next ? (
        <button className="row" onClick={() => go(`/visit/${next.id}`)}>
          <DateBox date={next.date} />
          <span className="body">
            <strong className="clamp">{next.type}</strong>
            <span className="sub clamp">
              {next.time}
              {showLoc ? ` · ${locName(next.locationId)}` : ""}
            </span>
            <Status label={next.status} />
          </span>
          <ChevronRight className="chev" {...ic} />
        </button>
      ) : (
        <p className="card t2">Belum ada kunjungan terjadwal.</p>
      )}

      <h2 className="h2">{attention.length ? "Perlu perhatian" : "Tanaman"}</h2>
      {plants.length === 0 ? (
        <div className="card empty-card">
          <p className="t2">Belum ada tanaman tercatat. Tim mencatatnya saat audit, atau Anda bisa menambahkannya sendiri.</p>
          <button className="btn" onClick={() => go("/plant/new")}>
            <Plus {...ic} />
            Tambah tanaman
          </button>
        </div>
      ) : attention.length ? (
        <div className="stack">
          {attention.map((p) => (
            <PlantRow key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <p className="card t2">Semua tanaman sehat.</p>
      )}

      <div className="btn-row" style={{ marginTop: 32 }}>
        <button className="btn" onClick={() => go("/report")}>
          Lapor masalah
        </button>
        <button className="btn" onClick={() => swap("/messages")}>
          Kirim pesan
        </button>
      </div>
    </main>
  );
}

/* ---------- Tanaman ---------- */

export function Plants() {
  const { db, inScope } = useStore();
  const [q, setQ] = useState("");
  const [f, setF] = useState<string>("Semua");
  const all = inScope(db.plants);
  const count = (s: string) => (s === "Semua" ? all.length : all.filter((p) => p.status === s).length);
  const shown = all.filter(
    (p) => (f === "Semua" || p.status === f) && `${p.name} ${p.area}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <main className="screen">
      <div className="stick">
      <Head
        title="Tanaman"
        sub={<ScopePill />}
        right={
          <button className="round add-btn" onClick={() => go("/plant/new")} aria-label="Tambah tanaman">
            <Plus {...ic} />
          </button>
        }
      />
      {all.length > 0 && (
        <>
          <label className="search">
            <Search {...ic} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari tanaman" aria-label="Cari tanaman" />
          </label>
          <div className="chips">
            {["Semua", ...PLANT_STATUS]
              .filter((x) => x === "Semua" || count(x) > 0)
              .map((x) => (
                <button key={x} className={`chip ${f === x ? "on" : ""}`} onClick={() => setF(x)}>
                  {x} <span className="num">{count(x)}</span>
                </button>
              ))}
          </div>
        </>
      )}
      </div>
      {all.length === 0 ? (
        <div className="card empty-card">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 17 }}>Belum ada tanaman</h2>
            <p className="t2">Tim mencatat tanaman saat audit. Anda juga bisa menambahkannya sendiri dengan foto.</p>
          </div>
          <button className="btn primary" onClick={() => go("/plant/new")}>
            <Plus {...ic} />
            Tambah tanaman
          </button>
        </div>
      ) : (
        <>
          {shown.length === 0 && <p className="empty">Tidak ada tanaman yang cocok.</p>}
          <div className="stack">
            {shown.map((p) => (
              <PlantRow key={p.id} p={p} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export function PlantDetail({ id }: { id: string }) {
  const { db, locName } = useStore();
  const p = db.plants.find((x) => x.id === id);
  if (!p) return <Missing to="/plants" />;
  return (
    <main className="screen">
      <Head title={p.name} sub={p.species ?? locName(p.locationId)} onBack={() => back("/plants")} />
      {p.image && <img className="hero-photo" src={p.image} alt={p.name} onError={(e) => (e.currentTarget.hidden = true)} />}
      <div className="card" style={{ marginTop: p.image ? 16 : 0 }}>
        <div className="kv">
          <div>
            <MapPin {...ic} />
            <div>
              <p>Lokasi</p>
              <p>
                {locName(p.locationId)} · {p.area}
              </p>
            </div>
          </div>
          <div>
            <Check {...ic} />
            <div>
              <p>Kondisi</p>
              <Status label={p.status} />
            </div>
          </div>
          <div>
            <CalendarDays {...ic} />
            <div>
              <p>Perawatan berikutnya</p>
              <p>{p.nextCare ? `${p.nextCare}${p.lastCare ? ` · terakhir ${p.lastCare}` : ""}` : "Belum dijadwalkan"}</p>
            </div>
          </div>
        </div>
      </div>
      {p.history.length > 0 && (
        <>
          <h2 className="h2">Riwayat perawatan</h2>
          <div className="timeline">
            {p.history.map((h) => (
              <div key={h.date + h.title}>
                <i />
                <div>
                  <p>{h.date}</p>
                  <strong>{h.title}</strong>
                  <p style={{ fontSize: 15, color: "var(--text-2)" }}>{h.text}</p>
                  <p>{h.by}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="btn primary" style={{ marginTop: 32 }} onClick={() => go(`/report/${p.id}`)}>
        Lapor masalah
      </button>
    </main>
  );
}

/* ---------- Kunjungan ---------- */

export function Visits() {
  const { db, inScope, showLoc, locName, myLocations, scope, requestVisit } = useStore();
  const [tab, setTab] = useState<"next" | "done">("next");
  const [ask, setAsk] = useState(false);
  const active = inScope(db.plans).filter((p) => p.status === "Aktif" && myLocations.some((l) => l.id === p.locationId));
  const target = scope !== "all" && active.some((p) => p.locationId === scope) ? scope : active[0]?.locationId;
  const all = inScope(db.visits);
  const list = all
    .filter((v) => (v.status === "Selesai") === (tab === "done"))
    .sort((a, b) => (tab === "done" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  return (
    <main className="screen">
      <div className="stick">
      <Head title="Kunjungan" sub={<ScopePill />} />
      <div className="seg" role="tablist">
        <button role="tab" className={tab === "next" ? "on" : ""} onClick={() => setTab("next")}>
          Mendatang
        </button>
        <button role="tab" className={tab === "done" ? "on" : ""} onClick={() => setTab("done")}>
          Selesai
        </button>
      </div>
      </div>
      {list.length === 0 && tab === "done" && <p className="empty">Belum ada kunjungan selesai.</p>}
      {list.length === 0 && tab === "next" && (
        <div className="card empty-card">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 17 }}>Belum ada kunjungan terjadwal</h2>
            <p className="t2">
              {myLocations.length === 0
                ? "Daftarkan lokasi untuk memulai audit."
                : target
                  ? "Ajukan kunjungan dan tim akan mengonfirmasi jadwalnya."
                  : "Kunjungan rutin dimulai setelah audit selesai dan paket aktif."}
            </p>
          </div>
          {myLocations.length === 0 ? (
            <button className="btn primary" onClick={() => go("/location/new")}>
              <Plus {...ic} />
              Daftarkan lokasi
            </button>
          ) : target ? (
            <button className="btn primary" onClick={() => setAsk(true)}>
              <Plus {...ic} />
              Ajukan kunjungan
            </button>
          ) : (
            <button className="btn" onClick={() => go("/billing")}>
              Lihat tagihan
            </button>
          )}
        </div>
      )}
      <div className="stack">
        {list.map((v) => (
          <button className="row" key={v.id} onClick={() => go(`/visit/${v.id}`)}>
            <DateBox date={v.date} />
            <span className="body">
              <strong className="clamp">{v.type}</strong>
              <span className="sub clamp">
                {v.time}
                {showLoc ? ` · ${locName(v.locationId)}` : ""}
              </span>
              <Status label={v.status} />
            </span>
            <ChevronRight className="chev" {...ic} />
          </button>
        ))}
      </div>
      {tab === "next" && list.length > 0 && target && (
        <button className="btn" style={{ marginTop: 24 }} onClick={() => setAsk(true)}>
          <Plus {...ic} />
          Ajukan kunjungan
        </button>
      )}
      {ask && target && (
        <SlotPicker title={`Ajukan kunjungan · ${locName(target)}`} onPick={(slot) => requestVisit(target, slot)} onClose={() => setAsk(false)} />
      )}
    </main>
  );
}

export function VisitDetail({ id }: { id: string }) {
  const { db, reschedule, locName } = useStore();
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const v = db.visits.find((x) => x.id === id);
  if (!v) return <Missing to="/visits" />;
  const long = fmt(v.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const r = v.report;
  const done = v.status === "Selesai";
  const extra = db.approvals
    .filter((a) => a.locationId === v.locationId && a.status === "Disetujui" && a.createdAt > "2026-10-20")
    .map((a) => a.title);
  const agenda = v.type === "Perawatan rutin" && !done ? [...v.agenda, ...extra] : v.agenda;
  const photoSrc = db.plants.find((p) => p.locationId === v.locationId && p.image)?.image;
  return (
    <main className="screen">
      <Head title={v.type} sub={long} onBack={() => back("/visits")} />
      <Status label={v.status} />
      <div className="card" style={{ marginTop: 16 }}>
        <div className="kv">
          <div>
            <Clock3 {...ic} />
            <div>
              <p>Waktu</p>
              <p className="num">{v.time} WIB</p>
            </div>
          </div>
          <div>
            <MapPin {...ic} />
            <div>
              <p>Lokasi</p>
              <p>{locName(v.locationId)}</p>
            </div>
          </div>
          <div>
            <User {...ic} />
            <div>
              <p>Petugas</p>
              <p>{v.staff}</p>
            </div>
          </div>
        </div>
      </div>

      {!done && (
        <>
          {v.status === "Menunggu konfirmasi" && (
            <p className="card warn" style={{ marginTop: 16 }}>
              Tim sedang mengonfirmasi jadwal{v.resched ? ` ${v.resched}` : ""}. Kami balas lewat Pesan.
            </p>
          )}
          <h2 className="h2">Agenda</h2>
          <div className="checks">
            {agenda.map((a) => (
              <p key={a}>
                <Check {...ic} />
                {a}
              </p>
            ))}
          </div>
          {v.status === "Terjadwal" && (
            <button className="btn" style={{ marginTop: 32 }} onClick={() => setSheet(true)}>
              Ubah jadwal
            </button>
          )}
        </>
      )}

      {r && (
        <>
          {photoSrc && v.type !== "Audit lokasi" && (
            <>
              <h2 className="h2">Sebelum dan sesudah</h2>
              <div className="pair">
                <figure>
                  <button onClick={() => setPhoto(photoSrc)} style={{ width: "100%" }}>
                    <img className="before" src={photoSrc} alt="Sebelum perawatan" />
                  </button>
                  <figcaption>Sebelum</figcaption>
                </figure>
                <figure>
                  <button onClick={() => setPhoto(photoSrc)} style={{ width: "100%" }}>
                    <img src={photoSrc} alt="Sesudah perawatan" />
                  </button>
                  <figcaption>Sesudah</figcaption>
                </figure>
              </div>
            </>
          )}
          <h2 className="h2">Yang dikerjakan</h2>
          <div className="checks">
            {r.acts.map((a) => (
              <p key={a}>
                <Check {...ic} />
                {a}
              </p>
            ))}
          </div>
          <h2 className="h2">Kondisi setelah kunjungan</h2>
          <p className="card t2 num">
            {r.sehat} sehat · {r.perhatian} perlu perhatian · {r.rawat} dalam perawatan
          </p>
          <h2 className="h2">Catatan petugas</h2>
          <p className="card t2">{r.note}</p>
          <button className="btn" style={{ marginTop: 24 }} onClick={() => share(`Laporan ${r.id}`)}>
            <Share2 {...ic} />
            Bagikan laporan {r.id}
          </button>
        </>
      )}

      {sheet && (
        <SlotPicker
          title="Pilih jadwal usulan"
          onPick={(slot) => reschedule(v.id, slot)}
          onClose={() => setSheet(false)}
        />
      )}
      {photo && (
        <div className="photo-view" onClick={() => setPhoto(null)}>
          <button className="round" style={{ position: "absolute", top: 16, right: 16 }} aria-label="Tutup">
            <X {...ic} />
          </button>
          <img src={photo} alt="Dokumentasi diperbesar" />
        </div>
      )}
    </main>
  );
}

/* ---------- Pesan ---------- */

export function Messages() {
  const { db, inScope } = useStore();
  const threads = inScope(db.threads);
  if (auth.mode() === "guest")
    return (
      <main className="screen">
        <Head title="Pesan" />
        <div className="card empty-card">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: 17 }}>Masuk untuk bertanya ke tim</h2>
            <p className="t2">Percakapan dengan tim LESTARI, laporan masalah, dan persetujuan biaya muncul di sini setelah Anda masuk.</p>
          </div>
          <button className="btn primary" onClick={() => go("/thread/tim")}>
            Masuk dulu
          </button>
        </div>
      </main>
    );
  return (
    <main className="screen">
      <Head title="Pesan" />
      <div className="list">
        {threads.map((t) => {
          const last = t.msgs[t.msgs.length - 1];
          return (
            <button key={t.id} onClick={() => go(`/thread/${t.id}`)}>
              <span className="icon-box">
                <MessageCircle {...ic} />
              </span>
              <span className="body">
                <strong className="clamp">{t.title}</strong>
                <span className="sub clamp">{last?.text ?? "Foto"}</span>
              </span>
              {t.unread > 0 && (
                <span className="st st-warn">
                  <i />
                </span>
              )}
              <ChevronRight className="chev" {...ic} />
            </button>
          );
        })}
      </div>
    </main>
  );
}

export function Thread({ id }: { id: string }) {
  const { db, send, markRead } = useStore();
  const t = db.threads.find((x) => x.id === id);
  const [text, setText] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const n = t?.msgs.length ?? 0;
  useEffect(() => {
    const sc = end.current?.closest(".chat-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }, [id, n]);
  const unread = t?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) markRead(id);
    // markRead tidak stabil (dibuat ulang tiap render); cukup bergantung pada id dan jumlah unread
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, unread]);
  if (!t) return <Missing to="/messages" />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send(id, text.trim());
    setText("");
  };
  return (
    <main className="screen chatpage" data-scrolled={scrolled || undefined}>
      <Head title={t.title} sub={t.sub} onBack={() => back("/messages")} />
      <div className="chat-scroll" onScroll={(e) => {
          const first = e.currentTarget.querySelector(".bubble");
          setScrolled(!!first && first.getBoundingClientRect().top < e.currentTarget.getBoundingClientRect().top);
        }}>
        <div className="chat">
          {t.msgs.map((m) => (
            <div key={m.id} className={`bubble ${m.from === "me" ? "me" : ""}`}>
              {m.img && <img src={m.img} alt="Foto terlampir" />}
              {m.text}
              <small>{m.at}</small>
            </div>
          ))}
          <div ref={end} />
        </div>
      </div>
      <form className="composer" onSubmit={submit}>
        <label className="round" aria-label="Lampirkan foto">
          <Camera {...ic} />
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) send(id, undefined, await fileToDataUrl(f));
            }}
          />
        </label>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan" aria-label="Tulis pesan" />
        <button className="round send" aria-label="Kirim" disabled={!text.trim()}>
          <Send {...ic} />
        </button>
      </form>
    </main>
  );
}

export function Missing({ to }: { to: string }) {
  return (
    <main className="screen">
      <Head title="Tidak ditemukan" onBack={() => back(to)} />
      <p className="empty">Halaman ini tidak tersedia.</p>
    </main>
  );
}
