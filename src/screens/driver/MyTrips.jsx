import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { errText, useLang, useT } from "../../i18n";
import { askConfirm, haptic, openLink, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { compressImage, fmtDate, isActive, money, routeUrl } from "../../utils";

const NEXT = { accepted: "on_the_way", on_the_way: "picked_up", picked_up: "delivered" };

function ActiveTrip({ o, onChanged }) {
  const t = useT();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const next = NEXT[o.status];

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
          {o.client.phone && <a className="link-btn" href={`tel:${o.client.phone}`}>{t("call")}</a>}
        </div>
      )}

      <div className="grid-2">
        <Button variant="secondary" onClick={() => openLink(routeUrl(o))}>{t("route")}</Button>
        {["accepted", "on_the_way"].includes(o.status) && (
          <Button variant="secondary" onClick={release} disabled={busy}>{t("release")}</Button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
      {next && <Button onClick={onNext} busy={busy}>{t(`next_${next}`)}</Button>}
    </Card>
  );
}

export default function MyTrips() {
  const t = useT();
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(
    () => api("my_trips").then((d) => (setData(d), setError(null))).catch(setError),
    [],
  );

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  if (!data && !error) return <Loading />;
  const active = data?.orders.filter((o) => isActive(o.status)) || [];
  const done = data?.orders.filter((o) => !isActive(o.status)) || [];

  return (
    <div className="page">
      {error && <p className="error">{errText(t, error)}</p>}
      {data && (
        <div className="stats">
          <div><span className="hint small">{t("earn_today")}</span><b>{money(data.earnings_today)}</b></div>
          <div><span className="hint small">{t("earn_total")}</span><b>{money(data.earnings_total)}</b></div>
          <div><span className="hint small">{t("trips_count")}</span><b>{data.trips_total}</b></div>
        </div>
      )}

      <h3>{t("active_trips")}</h3>
      {active.length === 0 && <p className="hint">{t("no_active")}</p>}
      {active.map((o) => <ActiveTrip key={o.id} o={o} onChanged={load} />)}

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
            <span>{money(o.price - o.commission)} {t("sum")}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
