import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { errText, useLang, useT } from "../../i18n";
import { askConfirm, haptic, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { etaMinutes, fmtDate, isActive, minutesSince, money } from "../../utils";

const OrderMap = lazy(() => import("../../components/OrderMap"));

// Haydovchi hozir qayerga ketyapti: yuk olishga yoki manzilga
function nextTarget(o) {
  if (["accepted", "on_the_way"].includes(o.status)) return { lat: o.from_lat, lng: o.from_lng, drop: false };
  if (o.status === "picked_up") return { lat: o.to_lat, lng: o.to_lng, drop: true };
  return null;
}

function LiveBox({ o }) {
  const t = useT();
  const d = o.driver;
  if (!d || d.lat == null || !isActive(o.status)) return null;
  const target = nextTarget(o);
  const arrived = o.status === "picked_up" ? !!o.drop_arrived_at : !!o.pickup_arrived_at;
  const eta = target && !arrived ? etaMinutes({ lat: d.lat, lng: d.lng }, target) : null;
  const ago = minutesSince(d.location_updated_at);

  return (
    <div className="eta-box">
      {arrived ? (
        <b>📍 {t("driver_arrived")}</b>
      ) : (
        eta != null && <b>🚚 {t(target.drop ? "eta_drop" : "eta", { min: eta })}</b>
      )}
      <span className="hint small">
        {ago < 1 ? t("location_now") : t("location_ago", { min: ago })} · {t("driver_on_map")}
      </span>
    </div>
  );
}

export default function OrderDetail({ id, onBack }) {
  const t = useT();
  const { lang } = useLang();
  const [o, setO] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api("order", { order_id: id }).then((x) => (setO(x), setError(null))).catch(setError),
    [id],
  );

  // Faol buyurtmada har 10 soniyada, qolganlarida har 30 soniyada yangilaymiz
  const active = o ? isActive(o.status) || o.status === "new" : true;
  useEffect(() => {
    load();
    const timer = setInterval(load, active ? 10000 : 30000);
    return () => clearInterval(timer);
  }, [load, active]);

  const cancel = async () => {
    if (!(await askConfirm(t("cancel_confirm")))) return;
    setBusy(true);
    try {
      await api("cancel_order", { order_id: id });
      haptic("success");
      await load();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <button className="link-btn" onClick={onBack}>{t("back")}</button>
      {!o && !error && <Loading />}
      {error && <p className="error">{errText(t, error)}</p>}
      {o && (
        <>
          <div className="row-between">
            <h3>{t("order_n", { id: o.id })}</h3>
            <StatusBadge status={o.status} />
          </div>

          <LiveBox o={o} />

          <Suspense fallback={<div className="order-map" style={{ height: 220 }} />}>
            <OrderMap order={o} height={220} />
          </Suspense>

          {o.driver && (
            <Card>
              <span className="field-label">{t("driver")}</span>
              <b>{o.driver.name}</b>
              <div className="hint">
                {o.vehicle?.model} · {o.vehicle?.plate_number} · ⭐ {o.driver.rating}
              </div>
              {o.driver.phone && isActive(o.status) && (
                <a className="btn btn-secondary" href={`tel:${o.driver.phone}`}>{t("call")} {o.driver.phone}</a>
              )}
            </Card>
          )}

          <Card>
            <Route order={o} />
            <OrderFacts order={o} />
            <div className="row-between">
              <span className="hint">{t("pickup_time")}</span>
              <span>{fmtDate(o.pickup_at, lang)}</span>
            </div>
            {(o.recipient_name || o.recipient_phone) && (
              <div className="row-between">
                <span className="hint">{t("recipient")}</span>
                <span>{[o.recipient_name, o.recipient_phone].filter(Boolean).join(" · ")}</span>
              </div>
            )}
            {o.comment && <p className="hint">💬 {o.comment}</p>}

            <div className="divider" />
            <div className="price-lines">
              <div className="row-between">
                <span className="hint">{t("price")}</span>
                <span>{money(o.price)} {t("sum")}</span>
              </div>
              {o.wait_price > 0 && (
                <div className="row-between">
                  <span className="hint">{t("wait_paid", { min: o.wait_minutes })}</span>
                  <span>+{money(o.wait_price)} {t("sum")}</span>
                </div>
              )}
              <div className="row-between">
                <b>{t("total")}</b>
                <b>{money(o.final_price ?? o.price)} {t("sum")}</b>
              </div>
            </div>
          </Card>

          <Card>
            <span className="field-label">{t("history")}</span>
            {o.history?.map((h, i) => (
              <div key={i} className="row-between small">
                <span>{t(`status_${h.status}`)}</span>
                <span className="hint">{fmtDate(h.created_at, lang)}</span>
              </div>
            ))}
          </Card>

          {["new", "accepted", "on_the_way"].includes(o.status) && (
            <Button variant="danger" onClick={cancel} busy={busy}>{t("cancel_order")}</Button>
          )}
        </>
      )}
    </div>
  );
}
