import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AUDIT_PRICE,
  Account,
  DB,
  Location,
  LocationType,
  TODAY,
  day,
  iso,
  pushMsg,
  seed,
  uid,
  planOf,
} from "./data";

const KEY = "lestari-db-v1";

const load = (): DB => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {}
  return seed("jalan");
};

const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n + 1, 0);

/** Foto → data URL kecil, supaya muat di localStorage dan terbaca di jendela admin. */
export const fileToDataUrl = (f: File, max = 800) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve(String(r.result));
      img.src = String(r.result);
    };
    r.readAsDataURL(f);
  });

export type Slot = { label: string; date: string; time: string };

type Store = {
  db: DB;
  me: Account;
  myLocations: Location[];
  scope: string;
  scopeIds: string[];
  showLoc: boolean;
  setScope: (s: string) => void;
  inScope: <T extends { locationId?: string }>(a: T[]) => T[];
  locName: (id?: string) => string;
  toastMsg: string;
  toastOn: boolean;
  toastKey: number;
  toast: (m: string) => void;
  mut: (fn: (d: DB) => void) => void;
  reset: (scenario: DB["scenario"]) => void;
  send: (threadId: string, text?: string, img?: string) => void;
  markRead: (threadId: string, side?: "me" | "team") => void;
  decide: (approvalId: string, d: "Disetujui" | "Ditolak") => void;
  pay: (invoiceId: string, method: string) => void;
  renew: (locationId: string, months: number) => string;
  reportIssue: (p: { plantId: string; kind: string; note: string; img?: string }) => string;
  reschedule: (visitId: string, slot: Slot) => void;
  addLocation: (p: { name: string; type: LocationType; address: string; city: string; district: string; postal: string; count: string; note: string; photo?: string; slot: Slot }) => string;
  updateProfile: (name: string, phone: string) => void;
  requestVisit: (locationId: string, slot: Slot) => void;
  addPlant: (p: { locationId: string; name: string; species: string; area: string; image?: string }) => string;
};

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const ref = useRef(db);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const timer = useRef(0);
  const timer2 = useRef(0);

  const commit = useCallback((n: DB) => {
    ref.current = n;
    setDb(n);
    try {
      localStorage.setItem(KEY, JSON.stringify(n));
    } catch {
      // ponytail: localStorage penuh (foto besar); data tetap di memori sampai refresh
    }
  }, []);
  const mut = useCallback(
    (fn: (d: DB) => void) => {
      const n = structuredClone(ref.current);
      fn(n);
      commit(n);
    },
    [commit],
  );

  // sinkron antar jendela (app pelanggan <-> dashboard admin)
  useEffect(() => {
    const f = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        const n = JSON.parse(e.newValue) as DB;
        ref.current = n;
        setDb(n);
      }
    };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, []);

  // fade in saat muncul, fade out saat hilang (dilepas dari DOM setelah animasi keluar selesai)
  const toast = useCallback((m: string) => {
    window.clearTimeout(timer.current);
    window.clearTimeout(timer2.current);
    setToastMsg(m);
    setToastOn(true);
    setToastKey((k) => k + 1);
    timer.current = window.setTimeout(() => setToastOn(false), 2400);
    timer2.current = window.setTimeout(() => setToastMsg(""), 2640);
  }, []);

  const me = db.accounts.find((a) => a.id === db.me)!;
  const myLocations = db.locations.filter((l) => l.accountId === db.me);
  const scope = db.scope === "all" || myLocations.some((l) => l.id === db.scope) ? db.scope : "all";
  const scopeIds = scope === "all" ? myLocations.map((l) => l.id) : [scope];
  const inScope: Store["inScope"] = (a) => a.filter((x) => !x.locationId || scopeIds.includes(x.locationId));
  const locName = (id?: string) => db.locations.find((l) => l.id === id)?.name ?? "";
  const showLoc = scope === "all" && myLocations.length > 1;

  const reply = (threadId: string, text: string, delay = 1500) =>
    window.setTimeout(() => mut((d) => pushMsg(d, threadId, { from: "team", text }, "team")), delay);

  const newThread = (d: DB, t: { title: string; sub: string; locationId?: string }, first: { text?: string; img?: string }) => {
    const id = uid();
    d.threads.unshift({ id, ...t, unread: 0, adminUnread: 1, acked: true, msgs: [] });
    pushMsg(d, id, { from: "me", ...first }, "me");
    d.threads[0].adminUnread = 1;
    return id;
  };

  const store: Store = {
    db,
    me,
    myLocations,
    scope,
    scopeIds,
    showLoc,
    setScope: (s) => mut((d) => void (d.scope = s)),
    inScope,
    locName,
    toastMsg,
    toastOn,
    toastKey,
    toast,
    mut,
    reset: (scenario) => commit(seed(scenario)),

    send: (threadId, text, img) => {
      const t = ref.current.threads.find((x) => x.id === threadId);
      const first = t && !t.acked;
      mut((d) => {
        pushMsg(d, threadId, { from: "me", text, img }, "me");
        if (first) d.threads.find((x) => x.id === threadId)!.acked = true;
      });
      if (first) reply(threadId, "Terima kasih, pesan Anda sudah kami terima. Tim akan membalas dalam beberapa menit.");
    },

    markRead: (threadId, side = "me") => {
      const cur = ref.current.threads.find((x) => x.id === threadId);
      if (!cur || (side === "me" ? !cur.unread : !cur.adminUnread)) return;
      mut((d) => {
        const t = d.threads.find((x) => x.id === threadId);
        if (!t) return;
        if (side === "me" && t.unread) t.unread = 0;
        if (side === "team" && t.adminUnread) t.adminUnread = 0;
      });
    },

    decide: (approvalId, decision) => {
      let tid = "";
      mut((d) => {
        const a = d.approvals.find((x) => x.id === approvalId);
        if (!a) return;
        a.status = decision;
        tid = a.threadId;
        if (decision === "Disetujui") {
          d.invoices.unshift({ id: "INV-" + uid().toUpperCase().slice(0, 4), locationId: a.locationId, title: a.title, amount: a.amount, due: iso(new Date(TODAY.getTime() + 14 * 864e5)), status: "Belum dibayar" });
          pushMsg(d, tid, { from: "me", text: `Saya setujui: ${a.title}.` }, "me");
        } else pushMsg(d, tid, { from: "me", text: `Saya tolak: ${a.title}.` }, "me");
      });
      toast(decision === "Disetujui" ? "Biaya disetujui" : "Permintaan ditolak");
      reply(
        tid,
        decision === "Disetujui"
          ? "Persetujuan diterima. Pekerjaan dijadwalkan pada kunjungan berikutnya dan tagihan sudah tersedia di menu Paket dan tagihan."
          : "Dicatat. Pekerjaan tidak akan dilakukan. Kami tetap memantau tanamannya pada kunjungan berikutnya.",
      );
    },

    pay: (invoiceId, method) =>
      mut((d) => {
        const inv = d.invoices.find((i) => i.id === invoiceId);
        if (!inv || inv.status === "Lunas") return;
        inv.status = "Lunas";
        inv.paidAt = iso(TODAY);
        inv.method = method;
        if (inv.months && inv.locationId) {
          const p = d.plans.find((x) => x.locationId === inv.locationId);
          if (p) p.until = iso(addMonths(p.until ? day(p.until) : TODAY, inv.months));
        }
        // pembayaran audit mengaktifkan antrean audit; paket diaktifkan admin setelah audit
      }),

    renew: (locationId, months) => {
      const id = "INV-R" + months + locationId.slice(-3).toUpperCase();
      const loc = ref.current.locations.find((l) => l.id === locationId);
      mut((d) => {
        d.invoices = d.invoices.filter((i) => i.id !== id);
        d.invoices.unshift({
          id,
          locationId,
          title: `Perpanjangan Care Basic ${loc?.name ?? ""}, ${months} bulan`,
          amount: planOf("basic").price * months,
          due: iso(new Date(TODAY.getTime() + 3 * 864e5)),
          status: "Belum dibayar",
          months,
        });
      });
      return id;
    },

    reportIssue: ({ plantId, kind, note, img }) => {
      let tid = "";
      mut((d) => {
        const p = d.plants.find((x) => x.id === plantId)!;
        if (p.status === "Sehat" || p.status === "Belum dicek") p.status = "Perlu perhatian";
        const loc = d.locations.find((l) => l.id === p.locationId);
        tid = newThread(d, { title: `Laporan: ${p.name}`, sub: `${loc?.name ?? ""} · ${kind}`, locationId: p.locationId }, { text: `${kind}. ${note}`.trim(), img });
      });
      reply(tid, "Laporan diterima. Kami akan memeriksa tanaman ini dalam 1x24 jam dan mengabari Anda di sini.", 1600);
      toast("Laporan terkirim");
      return tid;
    },

    reschedule: (visitId, slot) => {
      let tid = "";
      mut((d) => {
        const v = d.visits.find((x) => x.id === visitId)!;
        v.resched = slot.label;
        v.status = "Menunggu konfirmasi";
        const loc = d.locations.find((l) => l.id === v.locationId);
        tid = newThread(d, { title: "Ubah jadwal kunjungan", sub: `${loc?.name ?? ""} · usulan ${slot.label}`, locationId: v.locationId }, { text: `Saya ingin memindahkan kunjungan ${v.date} ke ${slot.label}.` });
      });
      reply(tid, `Permintaan diterima. Kami konfirmasi ketersediaan petugas untuk ${slot.label} secepatnya.`, 1600);
      toast("Permintaan terkirim");
    },

    addLocation: ({ name, type, address, city, district, postal, count, note, photo, slot }) => {
      const id = "l-" + uid();
      let tid = "";
      mut((d) => {
        d.locations.push({ id, accountId: d.me, name, type, address, city, district, postal, note });
        d.plans.push({ locationId: id, planId: "basic", status: "Menunggu audit" });
        d.visits.push({ id: "v" + uid(), locationId: id, date: slot.date, time: slot.time, type: "Audit lokasi", staff: "Ditentukan tim", status: "Menunggu konfirmasi", agenda: ["Inventaris tanaman", "Pengecekan cahaya dan media", "Rekomendasi paket"], resched: slot.label });
        d.invoices.unshift({ id: "INV-A" + uid().toUpperCase().slice(0, 3), locationId: id, title: `Green Audit ${name}`, amount: AUDIT_PRICE, due: iso(new Date(TODAY.getTime() + 7 * 864e5)), status: "Belum dibayar" });
        tid = newThread(d, { title: `Audit: ${name}`, sub: `${name} · usulan ${slot.label}`, locationId: id }, { text: `Saya mendaftarkan ${name} (${type}), sekitar ${count} tanaman. Alamat: ${address}. Usulan audit: ${slot.label}. ${note}`.trim(), img: photo });
        d.scope = id;
      });
      reply(tid, "Pengajuan diterima. Kami konfirmasi jadwal audit dalam 1x24 jam. Tagihan Green Audit sudah tersedia di menu Paket dan tagihan.", 1600);
      toast("Lokasi didaftarkan");
      return id;
    },

    updateProfile: (name, phone) =>
      mut((d) => {
        const a = d.accounts.find((x) => x.id === d.me)!;
        a.name = name;
        a.phone = phone;
      }),

    requestVisit: (locationId, slot) => {
      let tid = "";
      mut((d) => {
        const loc = d.locations.find((l) => l.id === locationId);
        d.visits.push({ id: "v" + uid(), locationId, date: slot.date, time: slot.time, type: "Perawatan rutin", staff: "Ditentukan tim", status: "Menunggu konfirmasi", agenda: ["Pengecekan kondisi tanaman", "Penyiraman dan pemberian nutrisi", "Pembersihan daun dan area pot", "Foto sebelum dan sesudah"], resched: slot.label });
        tid = newThread(d, { title: "Permintaan kunjungan", sub: `${loc?.name ?? ""} · usulan ${slot.label}`, locationId }, { text: `Saya ingin menambah kunjungan perawatan pada ${slot.label}.` });
      });
      reply(tid, `Permintaan diterima. Kami konfirmasi ketersediaan petugas untuk ${slot.label} secepatnya.`, 1600);
      toast("Permintaan terkirim");
    },

    addPlant: ({ locationId, name, species, area, image }) => {
      const id = "p-" + uid();
      mut((d) => {
        d.plants.push({ id, locationId, name, species: species || undefined, area, status: "Belum dicek", image, history: [{ date: "7 Nov 2026", title: "Ditambahkan oleh Anda", text: "Menunggu pengecekan tim pada kunjungan berikutnya.", by: "Anda" }] });
      });
      toast("Tanaman ditambahkan");
      return id;
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
