import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import OrderMap from "../../components/OrderMap";
import { errText, useLang, useT } from "../../i18n";
import { askConfirm, haptic, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { fmtDate, money } from "../../utils";

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

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

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

          <OrderMap order={o} />

          <Card>
            <Route order={o} />
            <OrderFacts order={o} />
            <div className="row-between">
              <span className="hint">{t("pickup_time")}</span>
              <span>{fmtDate(o.pickup_at, lang)}</span>
            </div>
            <div className="row-between">
              <span className="hint">{t("price")}</span>
              <b>{money(o.price)} {t("sum")}</b>
            </div>
            {o.comment && <p className="hint">💬 {o.comment}</p>}
          </Card>

          {o.driver && (
            <Card>
              <span className="field-label">{t("driver")}</span>
              <b>{o.driver.name}</b>
              <div className="hint">
                {o.vehicle?.model} · {o.vehicle?.plate_number} · ⭐ {o.driver.rating}
              </div>
              {o.driver.phone && (
                <a className="btn btn-secondary" href={`tel:${o.driver.phone}`}>{t("call")} {o.driver.phone}</a>
              )}
            </Card>
          )}

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
