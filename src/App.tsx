import { useEffect } from "react";
import { CalendarDays, Home as HomeIcon, MessageCircle, Sprout, UserRound } from "lucide-react";
import { Admin } from "./admin";
import {
  Account,
  Approval,
  ApprovalHistory,
  Billing,
  EditProfile,
  LocationForm,
  Locations,
  NotifSettings,
  Notifications,
  Pay,
  PlansInfo,
  PlantForm,
  ProfileSetup,
  Renew,
  ReportIssue,
} from "./flows";
import { auth, isProtected, returnTo, swap, useRoute } from "./router";
import { Home, Login, Messages, Missing, Onboarding, PlantDetail, Plants, Thread, VisitDetail, Visits } from "./screens";
import { StoreProvider, useStore } from "./store";
import { ic } from "./ui";

const TABS = [
  { path: "/", label: "Beranda", icon: HomeIcon },
  { path: "/plants", label: "Tanaman", icon: Sprout },
  { path: "/visits", label: "Kunjungan", icon: CalendarDays },
  { path: "/messages", label: "Pesan", icon: MessageCircle },
  { path: "/account", label: "Akun", icon: UserRound },
];

function route(path: string) {
  const [, seg = "", id] = path.split("/");
  switch (seg) {
    case "":
      return <Home />;
    case "login":
      return <Login />;
    case "setup":
      return <ProfileSetup />;
    case "welcome":
      return <Onboarding />;
    case "plans":
      return <PlansInfo />;
    case "plants":
      return <Plants />;
    case "plant":
      return id === "new" ? <PlantForm /> : <PlantDetail id={id} />;
    case "visits":
      return <Visits />;
    case "visit":
      return <VisitDetail id={id} />;
    case "messages":
      return <Messages />;
    case "thread":
      return <Thread id={id} />;
    case "approval":
      return <Approval id={id} />;
    case "approvals":
      return <ApprovalHistory />;
    case "report":
      return <ReportIssue plantId={id} />;
    case "location":
      return <LocationForm />;
    case "locations":
      return <Locations />;
    case "account":
      return <Account />;
    case "profile":
      return <EditProfile />;
    case "notif-settings":
      return <NotifSettings />;
    case "notifications":
      return <Notifications />;
    case "billing":
      return <Billing />;
    case "pay":
      return <Pay id={id} />;
    case "renew":
      return <Renew locationId={id} />;
    default:
      return <Missing to="/" />;
  }
}

/** Garis header hanya muncul jika konten benar-benar sudah tertutup header (bukan sekadar bergulir). */
function updateStroke() {
  const h = document.querySelector(".screen > .stick, .screen > .head");
  const n = h?.nextElementSibling;
  document.body.toggleAttribute("data-scrolled", !!h && !!n && n.getBoundingClientRect().top < h.getBoundingClientRect().bottom - 1);
}

function Shell() {
  const path = useRoute();
  const { db, toastMsg, toastOn, toastKey } = useStore();
  const admin = path.startsWith("/admin");
  const mode = auth.mode();
  const authed = mode === "user";
  const me = db.accounts.find((a) => a.id === db.me);
  // akun baru wajib mengisi nama dulu
  const needsSetup = authed && !admin && !!me && !me.name && path !== "/setup";
  // tamu boleh menjelajah, tapi layar komitmen butuh akun
  const gated = mode === "guest" && isProtected(path);
  const current = admin ? path : mode === "none" && path !== "/login" ? "/login" : gated ? "/login" : needsSetup ? "/setup" : path;
  useEffect(() => {
    if (gated) returnTo.set(path);
    if (current !== path) swap(current);
    window.scrollTo(0, 0);
    requestAnimationFrame(updateStroke);
  }, [current, path, gated]);
  // garis pemisah header muncul hanya saat konten bergulir di bawahnya
  useEffect(() => {
    updateStroke();
    window.addEventListener("scroll", updateStroke, { passive: true });
    window.addEventListener("resize", updateStroke);
    return () => {
      window.removeEventListener("scroll", updateStroke);
      window.removeEventListener("resize", updateStroke);
    };
  }, []);

  const toast = toastMsg && (
    <div key={toastKey} className={`toast ${toastOn ? "" : "out"}`} role="status">
      {toastMsg}
    </div>
  );
  if (admin)
    return (
      <>
        <Admin path={path} />
        {toast}
      </>
    );

  const tab = TABS.find((t) => t.path === current);
  const mine = db.locations.filter((l) => l.accountId === db.me).map((l) => l.id);
  const alert: Record<string, boolean> = {
    "/": db.approvals.some((a) => mine.includes(a.locationId) && a.status === "Menunggu keputusan") || db.invoices.some((i) => i.locationId && mine.includes(i.locationId) && i.status === "Belum dibayar"),
    "/messages": authed && db.threads.some((t) => t.unread > 0),
  };
  return (
    <div className="shell">
      <div className={`phone ${tab ? "with-tabs" : ""}`}>
        <div key={current}>{route(current)}</div>
        {tab && (
          <nav className="tabs" aria-label="Menu utama">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.path}
                  className={t.path === current ? "on" : ""}
                  aria-current={t.path === current ? "page" : undefined}
                  onClick={() => swap(t.path)}
                >
                  <Icon size={22} strokeWidth={ic.strokeWidth} />
                  {t.label}
                  {alert[t.path] && <span className="dot" />}
                </button>
              );
            })}
          </nav>
        )}
        {toast}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
