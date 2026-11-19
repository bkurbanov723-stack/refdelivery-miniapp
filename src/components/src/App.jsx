import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { errText, LangContext, useT } from "./i18n";
import { tg } from "./tg";
import { Button, Loading, Message, Toaster } from "./ui";
import ClientApp from "./screens/client/ClientApp";
import DriverApp from "./screens/driver/DriverApp";
import PhoneScreen from "./screens/PhoneScreen";
import RoleScreen from "./screens/RoleScreen";

// Admin panel faqat admin uchun yuklanadi
const AdminApp = lazy(() => import("./screens/admin/AdminApp"));

const MODE_KEY = "rd_mode";
const readMode = () => {
  try {
    return localStorage.getItem(MODE_KEY);
  } catch {
    return null;
  }
};
const writeMode = (m) => {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* saqlab bo'lmasa ham ishlayveradi */
  }
};

function Main({ me, refs, error, mode, chooseMode, reload, admin, setAdmin }) {
  const t = useT();

  if (!tg?.initData) return <Message>{t("only_telegram")}</Message>;
  if (error) {
    return (
      <Message action={<Button onClick={() => window.location.reload()}>{t("retry")}</Button>}>
        {errText(t, error)}
      </Message>
    );
  }
  if (!me || !refs) return <Loading />;
  if (!me.user.phone) return <PhoneScreen reload={reload} />;
  if (admin && me.user.role === "admin") {
    return (
      <Suspense fallback={<Loading />}>
        <AdminApp onExit={() => setAdmin(false)} />
      </Suspense>
    );
  }
  if (!mode) return <RoleScreen onChoose={chooseMode} />;
  const onAdmin = me.user.role === "admin" ? () => setAdmin(true) : null;
  if (mode === "driver") return <DriverApp me={me} reload={reload} switchMode={chooseMode} onAdmin={onAdmin} />;
  return <ClientApp me={me} refs={refs} switchMode={chooseMode} onAdmin={onAdmin} />;
}

export default function App() {
  const [lang, setLang] = useState(tg?.initDataUnsafe?.user?.language_code === "ru" ? "ru" : "uz");
  const [me, setMe] = useState(null);
  const [refs, setRefs] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [admin, setAdmin] = useState(false);

  const reload = useCallback(async () => {
    const m = await api("me");
    setMe(m);
    return m;
  }, []);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    if (!tg?.initData) return;
    (async () => {
      try {
        const { refs: r, ...m } = await api("init");
        setMe(m);
        setRefs(r);
        setLang(m.user.language === "ru" ? "ru" : "uz");
        const saved = readMode();
        if (m.user.role === "driver") setMode("driver");
        else if (saved === "client" || saved === "driver") setMode(saved);
        else if (m.driver) setMode("driver");
      } catch (e) {
        setError(e);
      }
    })();
  }, []);

  // Rejim tanlash: mijoz yoki haydovchi
  const chooseMode = useCallback(async (role) => {
    await api("set_role", { role });
    await reload();
    writeMode(role);
    setMode(role);
  }, [reload]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div className="app">
        <Main me={me} refs={refs} error={error} mode={mode} chooseMode={chooseMode} reload={reload}
          admin={admin} setAdmin={setAdmin} />
      </div>
      <Toaster />
    </LangContext.Provider>
  );
}
