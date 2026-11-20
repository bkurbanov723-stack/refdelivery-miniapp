import { useEffect, useState } from "react";
import { api } from "../../api";
import LiveGuide from "../../components/LiveGuide";
import { errText, useLang, useT } from "../../i18n";
import { haptic, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route } from "../../ui";
import { fmtDate, getPosition, money } from "../../utils";

export default function AvailableOrders({ me, reload, onAccepted }) {
  const t = useT();
  const { lang } = useLang();
  const online = !!me.driver?.is_online;
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    if (!online) {
      setOrders(null);
      return;
    }
    let alive = true;
    const load = () =>
      api("available_orders")
        .then((list) => alive && (setOrders(list), setError(null)))
        .catch((e) => alive && setError(e));
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [online]);

  const toggle = async () => {
    setSwitching(true);
    try {
      if (online) {
        await api("driver_location", { is_online: false });
      } else {
        const pos = await getPosition().catch(() => null);
        await api("driver_location", { is_online: true, ...(pos || {}) });
        if (!pos) toast(t("no_location"));
      }
      haptic("medium");
      await reload();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setSwitching(false);
    }
  };

  const accept = async (id) => {
    setAccepting(id);
    try {
      await api("accept_order", { order_id: id });
      haptic("success");
      toast(t("accepted_ok"));
      onAccepted();
    } catch (e) {
      haptic("error");
      toast(errText(t, e));
      setOrders((list) => list?.filter((o) => o.id !== id));
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="page">
      <Card className={`online-card ${online ? "on" : ""}`}>
        <div className="row-between">
          <b>{online ? `🟢 ${t("online")}` : `⚪ ${t("offline")}`}</b>
          <Button variant={online ? "secondary" : "primary"} className="btn-inline" onClick={toggle} busy={switching}>
            {online ? t("go_offline") : t("go_online")}
          </Button>
        </div>
      </Card>

      {online && <LiveGuide />}
      {!online && <p className="hint text-center">{t("offline_hint")}</p>}
      {online && !orders && !error && <Loading />}
      {error && <p className="error">{errText(t, error)}</p>}
      {online && orders?.length === 0 && <p className="hint text-center">{t("no_available")}</p>}

      {orders?.map((o) => (
        <Card key={o.id}>
          <div className="row-between">
            <b>{t("order_n", { id: o.id })}</b>
            <span className="hint small">{fmtDate(o.pickup_at, lang)}</span>
          </div>
          <Route order={o} />
          <OrderFacts order={o} />
          {o.comment && <p className="hint small">💬 {o.comment}</p>}
          <div className="row-between">
            <span className="hint">{t("you_get")}</span>
            <span className="price-sm">{money(o.price - o.commission)} {t("sum")}</span>
          </div>
          <Button onClick={() => accept(o.id)} busy={accepting === o.id} disabled={!!accepting}>
            {t("accept")}
          </Button>
        </Card>
      ))}
    </div>
  );
}
