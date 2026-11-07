import { useEffect, useState } from "react";

const read = () => window.location.hash.replace(/^#/, "") || "/";

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const f = () => setPath(read());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return path;
}

/** Mode masuk: "user" (login), "guest" (tamu, boleh menjelajah), "none" (belum memilih). */
export type Mode = "user" | "guest" | "none";
const KEY = "lestari-auth";
export const auth = {
  mode: (): Mode => {
    try {
      const v = localStorage.getItem(KEY);
      return v === "1" ? "user" : v === "g" ? "guest" : "none";
    } catch {
      return "none";
    }
  },
  get: () => auth.mode() === "user",
  set: (v: boolean) => {
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
  },
  guest: () => {
    try {
      localStorage.setItem(KEY, "g");
    } catch {}
  },
};

/** Tujuan yang tertunda: tamu menekan aksi komitmen, login dulu, lalu kembali ke sini. */
export const returnTo = {
  set: (p: string) => {
    try {
      sessionStorage.setItem("lestari-return", p);
    } catch {}
  },
  peek: () => {
    try {
      return sessionStorage.getItem("lestari-return");
    } catch {
      return null;
    }
  },
  take: () => {
    const v = returnTo.peek();
    try {
      sessionStorage.removeItem("lestari-return");
    } catch {}
    return v;
  },
};

// Layar komitmen: butuh akun. Melihat dan membaca tidak pernah diblokir.
const PROTECTED = [/^\/location\/new/, /^\/plant\/new/, /^\/report/, /^\/thread\//, /^\/pay\//, /^\/renew\//, /^\/profile/];
export const isProtected = (p: string) => PROTECTED.some((r) => r.test(p));
const guard = (p: string) => {
  if (auth.mode() === "guest" && isProtected(p)) {
    returnTo.set(p);
    return "/login";
  }
  return p;
};

let pushed = 0;
/** Buka layar baru (bisa kembali). Tamu diarahkan login bila layar butuh akun. */
export const go = (p: string) => {
  pushed++;
  window.location.hash = guard(p);
};
/** Pindah tab / ganti layar tanpa menambah riwayat. */
export const swap = (p: string) => window.location.replace(`#${guard(p)}`);
/** Kembali ke layar sebelumnya di dalam app, atau ke `fallback`. */
export const back = (fallback: string) => {
  if (pushed > 0) {
    pushed--;
    window.history.back();
  } else swap(fallback);
};

export const onboarded = {
  get: () => {
    try {
      return localStorage.getItem("lestari-onboarded") === "1";
    } catch {
      return false;
    }
  },
  set: () => {
    try {
      localStorage.setItem("lestari-onboarded", "1");
    } catch {}
  },
};
