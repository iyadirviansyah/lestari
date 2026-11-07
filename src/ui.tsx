import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, MapPin, Plus, Sprout } from "lucide-react";
import { go } from "./router";
import { Slot, useStore } from "./store";
import { TODAY, fmt, iso } from "./data";

export const ic = { size: 18, strokeWidth: 1.5 } as const;

const tone: Record<string, string> = {
  Sehat: "ok",
  "Perlu perhatian": "warn",
  "Dalam perawatan": "care",
  "Belum dicek": "mute",
  Terjadwal: "ok",
  "Menunggu konfirmasi": "warn",
  Selesai: "mute",
  Lunas: "ok",
  "Belum dibayar": "warn",
  Disetujui: "ok",
  Ditolak: "mute",
  "Menunggu keputusan": "warn",
};

/** Titik status 8px + label: detail khas LESTARI, dipakai di mana pun status muncul. */
export const Status = ({ label }: { label: string }) => (
  <span className={`st st-${tone[label] ?? "mute"}`}>
    <i />
    {label}
  </span>
);

export function Head({
  title,
  sub,
  onBack,
  right,
}: {
  title: string;
  sub?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="head">
      {onBack && (
        <button className="round" onClick={onBack} aria-label="Kembali">
          <ArrowLeft {...ic} />
        </button>
      )}
      {sub ? (
        <div className="grow">
          <small>{sub}</small>
          <h1>{title}</h1>
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {right}
    </header>
  );
}

/** Bottom sheet: dirender di body (menutupi tab bar), tutup dengan animasi turun. */
export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    const parent = node?.parentElement;
    let armed = false; // lewati cleanup palsu milik StrictMode saat mount
    const t = window.setTimeout(() => (armed = true), 0);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      if (!armed || !node || !parent) return;
      // ponytail: tiruan visual untuk animasi keluar, supaya semua jalur tutup ikut beranimasi tanpa ubah pemanggil
      const ghost = node.cloneNode(true) as HTMLElement;
      ghost.classList.add("leaving");
      parent.appendChild(ghost);
      window.setTimeout(() => ghost.remove(), 240);
    };
  }, []);
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  const center = !!document.querySelector(".adm");
  return createPortal(
    <div ref={ref} className={`scrim ${center ? "center" : ""}`} onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onScroll={(e) => {
          const h = e.currentTarget.querySelector(":scope > h2:first-child");
          const n = h?.nextElementSibling;
          e.currentTarget.toggleAttribute("data-scrolled", !!h && !!n && n.getBoundingClientRect().top < h.getBoundingClientRect().bottom - 1);
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

const TIMES = ["09.00 – 11.00", "13.00 – 15.00"];
const WEEK = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const ymd = (y: number, m: number, d: number) => iso(new Date(y, m, d));

/** Kalender dalam bottom sheet: pilih tanggal (Senin–Sabtu, mulai besok) lalu jam. */
export function SlotPicker({ title, value, onPick, onClose }: { title: string; value?: Slot; onPick: (s: Slot) => void; onClose: () => void }) {
  const first = value ? new Date(value.date) : TODAY;
  const [cur, setCur] = useState({ y: first.getFullYear(), m: first.getMonth() });
  const [date, setDate] = useState(value?.date ?? "");
  const [t, setT] = useState(value?.time ?? "");
  const minDate = iso(new Date(TODAY.getTime() + 864e5));
  const maxDate = iso(new Date(TODAY.getTime() + 90 * 864e5));
  const offset = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7;
  const days = new Date(cur.y, cur.m + 1, 0).getDate();
  const atStart = cur.y === TODAY.getFullYear() && cur.m === TODAY.getMonth();
  const go = (n: number) => setCur(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (m + n + 12) % 12 }));
  const label = date && t ? `${fmt(date, { weekday: "long", day: "numeric", month: "short" })} · ${t.split(" ")[0]}` : "";
  return (
    <Sheet onClose={onClose}>
      <h2>{title}</h2>
      <div className="cal-head">
        <button className="round" onClick={() => go(-1)} disabled={atStart} aria-label="Bulan sebelumnya">
          <ChevronLeft {...ic} />
        </button>
        <strong>{fmt(new Date(cur.y, cur.m, 1), { month: "long", year: "numeric" })}</strong>
        <button className="round" onClick={() => go(1)} aria-label="Bulan berikutnya">
          <ChevronRight {...ic} />
        </button>
      </div>
      <div className="cal-grid">
        {WEEK.map((w) => (
          <span key={w} className="cal-w">
            {w}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"e" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = ymd(cur.y, cur.m, i + 1);
          const off = d < minDate || d > maxDate || new Date(cur.y, cur.m, i + 1).getDay() === 0;
          return (
            <button key={d} className={`cal-d ${date === d ? "on" : ""}`} disabled={off} onClick={() => setDate(d)} aria-pressed={date === d}>
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="chips" style={{ margin: 0, padding: 0 }}>
        {TIMES.map((x) => (
          <button key={x} className={`chip ${t === x ? "on" : ""}`} onClick={() => setT(x)}>
            {x}
          </button>
        ))}
      </div>
      <button className="btn primary" disabled={!label} onClick={() => { onPick({ label, date, time: t }); onClose(); }}>
        {label ? `Pilih ${label}` : "Pilih tanggal dan jam"}
      </button>
    </Sheet>
  );
}

/** Baris pemilih jadwal untuk formulir; membuka kalender di bottom sheet. */
export function SlotField({ label, value, onChange }: { label: string; value?: Slot; onChange: (s: Slot) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="field">
      <span>{label}</span>
      <button type="button" className="picker" onClick={() => setOpen(true)}>
        <CalendarDays {...ic} />
        <span className={value ? "" : "ph"}>{value?.label ?? "Pilih tanggal dan jam"}</span>
        <ChevronRight className="chev" {...ic} />
      </button>
      {open && <SlotPicker title={label} value={value} onPick={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}

export const initials = (n: string) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const share = (title: string) => {
  // ponytail: dialog cetak = "Simpan sebagai PDF"; PDF sungguhan setelah ada backend
  if (navigator.share) navigator.share({ title, url: window.location.href }).catch(() => {});
  else window.print();
};

/** QR tiruan deterministik untuk layar bayar. */
export function Qr() {
  const n = 25;
  let seed = 7;
  const bit = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16) & 1;
  const finder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      if (bit()) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  const eye = (x: number, y: number) => (
    <g key={`e${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" />
    </g>
  );
  return (
    <svg className="qr" viewBox={`0 0 ${n} ${n}`} fill="#1b2620" role="img" aria-label="Kode QRIS">
      {cells}
      {eye(0, 0)}
      {eye(n - 7, 0)}
      {eye(0, n - 7)}
    </svg>
  );
}

export function Thumb({ src, alt }: { src?: string; alt: string }) {
  const [bad, setBad] = useState<string>();
  return src && bad !== src ? (
    <img className="thumb" src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBad(src)} />
  ) : (
    <span className="thumb empty" role="img" aria-label={alt}>
      <Sprout size={24} strokeWidth={1.5} />
    </span>
  );
}

export const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

/** Pilih lokasi aktif: satu lokasi atau semua. Titik masuk untuk menambah lokasi baru. */
export function ScopePill() {
  const { myLocations, scope, locName, setScope } = useStore();
  const [open, setOpen] = useState(false);
  const label = scope === "all" ? (myLocations.length ? "Semua lokasi" : "Belum ada lokasi") : locName(scope);
  return (
    <>
      <button className="pill" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <MapPin size={14} strokeWidth={1.5} />
        <span className="clamp">{label}</span>
        <ChevronDown size={14} strokeWidth={1.5} />
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h2>Lokasi</h2>
          <div className="opts">
            {myLocations.length > 1 && (
              <button
                className={`opt ${scope === "all" ? "on" : ""}`}
                onClick={() => {
                  setScope("all");
                  setOpen(false);
                }}
              >
                <span className="radio" />
                <span className="body">Semua lokasi</span>
              </button>
            )}
            {myLocations.map((l) => (
              <button
                key={l.id}
                className={`opt ${scope === l.id ? "on" : ""}`}
                onClick={() => {
                  setScope(l.id);
                  setOpen(false);
                }}
              >
                <span className="radio" />
                <span className="body">
                  <strong>{l.name}</strong>
                  <span className="sub">{l.type}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            className="btn"
            onClick={() => {
              setOpen(false);
              go("/location/new");
            }}
          >
            <Plus {...ic} />
            Tambah lokasi
          </button>
        </Sheet>
      )}
    </>
  );
}

export type Opt = { value: string; label: string; sub?: string };

/** Pilihan lewat bottom sheet (pengganti <select> di app pelanggan). */
export function SelectField({
  label,
  title,
  value,
  options,
  onChange,
  disabled,
  placeholder = "Pilih",
}: {
  label: string;
  title?: string;
  value: string;
  options: (string | Opt)[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const opts: Opt[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const cur = opts.find((o) => o.value === value);
  return (
    <div className="field">
      <span>{label}</span>
      <button type="button" className="picker" disabled={disabled} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className={cur ? "" : "ph"}>{cur?.label ?? placeholder}</span>
        <ChevronDown {...ic} />
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <h2>{title ?? label}</h2>
          <div className="opts">
            {opts.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`opt ${o.value === value ? "on" : ""}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                <span className="radio" />
                <span className="body">
                  <strong>{o.label}</strong>
                  {o.sub && <span className="sub">{o.sub}</span>}
                </span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
