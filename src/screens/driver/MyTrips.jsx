import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { errText, useLang, useT } from "../../i18n";
import { BOT_USERNAME } from "../../config";
import ChatSheet from "../../components/ChatSheet";
import { askConfirm, haptic, openLink, tg, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { compressImage, fmtDate, isActive, minutesSince, money, routeUrl } from "../../utils";

// Faol reys paytida ilova ochiq bo'lsa, joylashuvni har 15 soniyada yuboramiz
function useTripLocation(active) {
  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 15000) return;
        last = Date.now();
        api("driver_location", { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
}

// Botga jonli joylashuv ulashish bo'yicha eslatma
function LiveHint() {
  const t = useT();
  const openBot = () => {
    const url = `https://t.me/${BOT_USERNAME}`;
    try {
      if (tg?.openTelegramLink) return tg.openTelegramLink(url);
    } catch {
      /* oddiy havola */
    }
    openLink(url);
  };
  return (
    <div className="live-box">
      <b>{t("live_title")}</b>
      <span className="hint">{t("live_text")}</span>
      <Button variant="secondary" onClick={openBot}>{t("live_open_bot")}</Button>
    </div>
  );
}

const NEXT = { accepted: "on_the_way", on_the_way: "picked_up", picked_up: "delivered" };

function ActiveTrip({ o, onChanged, onChat }) {
  const t = useT();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const [, setTick] = useState(0);

  // Qaysi bosqichdamiz: avval "Yetib keldim", keyin keyingi status
  const atPickup = o.status === "on_the_way" && !o.pickup_arrived_at;
  const atDrop = o.status === "picked_up" && !o.drop_arrived_at;
  const needArrive = atPickup || atDrop;
  const next = NEXT[o.status];
  const waitingSince = o.status === "on_the_way" ? o.pickup_arrived_at : o.status === "picked_up" ? o.drop_arrived_at : null;
  const freeWait = 15;

  useEffect(() => {
    if (!waitingSince) return;
    const timer = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(timer);
  }, [waitingSince]);

  const arrive = async () => {
    setBusy(true);
    try {
      await api("arrived", { order_id: o.id });
      haptic("success");
      await onChanged();
    } catch (e) {
      haptic("error");
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const send = async (params) => {
    setBusy(true);
    try {
      await api("update_status", { order_id: o.id, ...params });
      haptic("success");
      await onChanged();
    } catch (e) {
      haptic("error");
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const onNext = () => {
    if (next === "delivered") {
      toast(t("photo_proof"));
      fileRef.current?.click();
    } else {
      send({ status: next });
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const photo = await compressImage(file, 1280, 0.75);
      await send({ status: "delivered", photo });
    } catch (err) {
      toast(errText(t, err));
    }
  };

  const release = async () => {
    if (!(await askConfirm(t("release_confirm")))) return;
    setBusy(true);
    try {
      await api("release_order", { order_id: o.id });
      await onChanged();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="active-trip">
      <div className="row-between">
        <b>{t("order_n", { id: o.id })}</b>
        <StatusBadge status={o.status} />
      </div>
      <Route order={o} />
      <OrderFacts order={o} />
      <div className="row-between">
        <span className="hint small">{fmtDate(o.pickup_at, lang)}</span>
        <span className="price-sm">{money(o.price - o.commission)} {t("sum")}</span>
      </div>
      {o.comment && <p className="hint small">💬 {o.comment}</p>}

      {o.client && (
        <div className="row-between">
          <span>{t("client")}: <b>{o.client.name}</b></span>
          <button className="link-btn" onClick={() => onChat(o)}>{t("chat_with_client")}</button>
        </div>
      )}

      {(o.recipient_name || o.recipient_phone) && (
        <div className="row-between">
          <span>{t("recipient")}: <b>{o.recipient_name || "—"}</b></span>
          {o.recipient_phone && <a className="link-btn" href={`tel:${o.recipient_phone}`}>{t("call")}</a>}
        </div>
      )}

      <div className="grid-2">
        <Button variant="secondary" onClick={() => openLink(routeUrl(o))}>{t("route")}</Button>
        {["accepted", "on_the_way"].includes(o.status) && (
          <Button variant="secondary" onClick={release} disabled={busy}>{t("release")}</Button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
      {waitingSince && !needArrive && (
        <div className="wait-box">{t("waiting", { min: minutesSince(waitingSince), free: freeWait })}</div>
      )}
      {needArrive ? (
        <Button onClick={arrive} busy={busy}>{t(atPickup ? "arrived_pickup" : "arrived_drop")}</Button>
      ) : (
        next && <Button onClick={onNext} busy={busy}>{t(`next_${next}`)}</Button>
      )}
    </Card>
  );
}

export default function MyTrips() {
  const t = useT();
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [chatOrder, setChatOrder] = useState(null);
  const [history, setHistory] = useState(null);

  const toggleHistory = async () => {
    if (history) return setHistory(null);
    try {
      setHistory((await api("my_balance")).transactions);
    } catch (e) {
      toast(errText(t, e));
    }
  };

  const load = useCallback(
    () => api("my_trips").then((d) => (setData(d), setError(null))).catch(setError),
    [],
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const active = data?.orders.filter((o) => isActive(o.status)) || [];
  const done = data?.orders.filter((o) => !isActive(o.status)) || [];
  useTripLocation(active.length > 0);

  if (!data && !error) return <Loading />;
  if (chatOrder) {
    return <ChatSheet orderId={chatOrder.id} title={t("order_n", { id: chatOrder.id })} onClose={() => setChatOrder(null)} />;
  }

  return (
    <div className="page">
      {error && <p className="error">{errText(t, error)}</p>}
      {data && (
        <div className={`balance-card ${data.balance < 0 ? "debt" : ""}`} onClick={toggleHistory}>
          <div className="row-between">
            <span>{data.balance < 0 ? t("balance_debt") : t("balance")}</span>
            <b>{money(data.balance)} {t("sum")}</b>
          </div>
          <span className="hint small">{t("balance_note")}</span>
          <span className="link-btn small">{t("balance_history")} {history ? "▲" : "▼"}</span>
          {history && history.map((x) => (
            <div key={x.id} className="row-between small">
              <span>{t(`tx_${x.kind}`)}{x.order_id ? ` #${x.order_id}` : ""}{x.comment ? ` · ${x.comment}` : ""}</span>
              <span className={x.amount < 0 ? "error" : "ok"}>{x.amount > 0 ? "+" : ""}{money(x.amount)}</span>
            </div>
          ))}
        </div>
      )}
      {data && (
        <div className="stats">
          <div><span className="hint small">{t("earn_today")}</span><b>{money(data.earnings_today)}</b></div>
          <div><span className="hint small">{t("earn_total")}</span><b>{money(data.earnings_total)}</b></div>
          <div><span className="hint small">{t("trips_count")}</span><b>{data.trips_total}</b></div>
        </div>
      )}

      <h3>{t("active_trips")}</h3>
      {active.length === 0 && <p className="hint">{t("no_active")}</p>}
      {active.length > 0 && <LiveHint />}
      {active.map((o) => <ActiveTrip key={o.id} o={o} onChanged={load} onChat={setChatOrder} />)}

      {done.length > 0 && <h3>{t("done_trips")}</h3>}
      {done.map((o) => (
        <Card key={o.id}>
          <div className="row-between">
            <b>{t("order_n", { id: o.id })}</b>
            <StatusBadge status={o.status} />
          </div>
          <Route order={o} />
          <div className="row-between">
            <span className="hint small">{fmtDate(o.delivered_at || o.created_at, lang)}</span>
            <span>{money((o.final_price ?? o.price) - o.commission)} {t("sum")}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
