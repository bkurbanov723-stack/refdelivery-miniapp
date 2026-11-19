import { useEffect, useState } from "react";
import { api } from "../../api";
import { errText, useLang, useT } from "../../i18n";
import { Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { fmtDate, money } from "../../utils";

export default function MyOrders({ onOpen }) {
  const t = useT();
  const { lang } = useLang();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api("my_orders")
        .then((list) => alive && (setOrders(list), setError(null)))
        .catch((e) => alive && setError(e));
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  if (!orders && !error) return <Loading />;

  return (
    <div className="page">
      {error && <p className="error">{errText(t, error)}</p>}
      {orders?.length === 0 && <p className="hint text-center">{t("no_orders")}</p>}
      {orders?.map((o) => (
        <Card key={o.id} onClick={() => onOpen(o.id)}>
          <div className="row-between">
            <b>{t("order_n", { id: o.id })}</b>
            <StatusBadge status={o.status} />
          </div>
          <Route order={o} />
          <OrderFacts order={o} />
          <div className="row-between">
            <span className="hint small">{fmtDate(o.pickup_at, lang)}</span>
            <b>{money(o.final_price ?? o.price)} {t("sum")}</b>
          </div>
        </Card>
      ))}
    </div>
  );
}
