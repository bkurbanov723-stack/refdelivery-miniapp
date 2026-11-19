import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { errText, useLang, useT } from "../../i18n";
import { askConfirm, haptic, toast } from "../../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../../ui";
import { fmtDate, money } from "../../utils";

// Ma'lumotni yuklash va yangilash uchun umumiy yordamchi
function useLoad(action, params, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () => api(action, params).then((d) => (setData(d), setError(null))).catch(setError),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  return { data, error, load };
}

function FilterRow({ value, onChange, options }) {
  return (
    <div className="filter-row">
      {options.map(([id, label]) => (
        <button key={id} className={value === id ? "active" : ""} onClick={() => onChange(id)}>{label}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// 1. Statistika
// ---------------------------------------------------------------------
function Stats() {
  const t = useT();
  const { data, error, load } = useLoad("admin_stats", {}, []);
  const [period, setPeriod] = useState("today");
  if (error) return <p className="error">{errText(t, error)}</p>;
  if (!data) return <Loading />;
  const p = data[period];
  return (
    <div className="page">
      <FilterRow value={period} onChange={setPeriod}
        options={[["today", t("a_today")], ["week", t("a_week")], ["month", t("a_month")]]} />
      <div className="stat-grid">
        <div className="stat"><span className="hint small">{t("a_orders_count")}</span><b>{p.orders}</b></div>
        <div className="stat"><span className="hint small">{t("a_active")}</span><b>{p.active}</b></div>
        <div className="stat"><span className="hint small">{t("a_delivered")}</span><b>{p.delivered}</b></div>
        <div className="stat"><span className="hint small">{t("a_cancelled")}</span><b>{p.cancelled}</b></div>
        <div className="stat"><span className="hint small">{t("a_revenue")}</span><b>{money(p.revenue)}</b></div>
        <div className="stat accent"><span className="hint small">{t("a_commission")}</span><b>{money(p.commission)}</b></div>
      </div>
      <h3>{t("a_drivers")}</h3>
      <div className="stat-grid">
        <div className="stat"><span className="hint small">{t("a_drivers_total")}</span><b>{data.drivers.total}</b></div>
        <div className="stat"><span className="hint small">{t("a_approved")}</span><b>{data.drivers.approved}</b></div>
        <div className="stat"><span className="hint small">{t("a_online")}</span><b>🟢 {data.drivers.online}</b></div>
        <div className="stat"><span className="hint small">{t("a_pending")}</span><b>⏳ {data.drivers.pending}</b></div>
        <div className="stat"><span className="hint small">{t("a_users")}</span><b>{data.users_total}</b></div>
      </div>
      <Button variant="secondary" onClick={load}>{t("refresh")}</Button>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. Buyurtmalar
// ---------------------------------------------------------------------
function AdminOrderCard({ o, onChanged }) {
  const t = useT();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!(await askConfirm(t("cancel_confirm")))) return;
    setBusy(true);
    try {
      await api("admin_cancel_order", { order_id: o.id, reason: "admin" });
      haptic("success");
      await onChanged();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <div className="row-between">
        <b>{t("order_n", { id: o.id })}</b>
        <StatusBadge status={o.status} />
      </div>
      <Route order={o} />
      <OrderFacts order={o} />
      <div className="small">
        <div>👤 {t("client")}: <b>{o.client?.name || "—"}</b> {o.client?.phone && <a href={`tel:${o.client.phone}`}>{o.client.phone}</a>}</div>
        {o.driver && (
          <div>🚚 {t("driver")}: <b>{o.driver.name}</b> {o.driver.phone && <a href={`tel:${o.driver.phone}`}>{o.driver.phone}</a>}
            {o.vehicle && <span className="hint"> · {o.vehicle.plate_number}</span>}
          </div>
        )}
      </div>
      <div className="row-between">
        <span className="hint small">{fmtDate(o.created_at, lang)}</span>
        <b>{money(o.final_price ?? o.price)} {t("sum")}</b>
      </div>
      {!["delivered", "cancelled"].includes(o.status) && (
        <Button variant="danger" onClick={cancel} busy={busy}>{t("a_cancel_order")}</Button>
      )}
    </Card>
  );
}

function Orders() {
  const t = useT();
  const [filter, setFilter] = useState("active");
  const { data, error, load } = useLoad("admin_orders", { filter }, [filter]);
  return (
    <div className="page">
      <FilterRow value={filter} onChange={setFilter} options={[
        ["active", t("a_active")], ["delivered", t("a_delivered")], ["cancelled", t("a_cancelled")], ["all", t("a_all")],
      ]} />
      {error && <p className="error">{errText(t, error)}</p>}
      {!data && !error && <Loading />}
      {data?.length === 0 && <p className="hint text-center">{t("no_orders")}</p>}
      <div className="admin-list">
        {data?.map((o) => <AdminOrderCard key={o.id} o={o} onChanged={load} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. Haydovchilar
// ---------------------------------------------------------------------
function DriverCard({ d, onChanged }) {
  const t = useT();
  const [busy, setBusy] = useState(null);
  const [docs, setDocs] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const v = d.vehicle;

  const run = async (key, action, params) => {
    setBusy(key);
    try {
      await api(action, params);
      haptic("success");
      await onChanged();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const showDocs = async () => {
    setBusy("docs");
    try {
      setDocs(await api("admin_driver_docs", { driver_id: d.user_id }));
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const statusLabel = { pending: `⏳ ${t("a_pending")}`, approved: `✅ ${t("a_approved")}`, rejected: `❌ ${t("a_rejected")}` };

  return (
    <Card>
      <div className="row-between">
        <b>{d.name || "—"}</b>
        <span className="small">{statusLabel[d.status]}{d.is_blocked ? ` · 🚫 ${t("a_blocked")}` : ""}</span>
      </div>
      <div className="small">
        {d.phone && <a href={`tel:${d.phone}`}>{d.phone}</a>}
        {d.status === "approved" && <span className="hint"> · {d.is_online ? `🟢 ${t("online")}` : `⚪ ${t("offline")}`} · ⭐ {d.rating} · {d.trips_count} {t("trips_count").toLowerCase()}</span>}
      </div>
      {v ? (
        <div className="small">
          🚛 <b>{v.model} · {v.plate_number}</b><br />
          ⚖️ {v.gross_weight_kg} − {v.curb_weight_kg} = <b>{v.payload_kg} kg</b> · {t(`size_${v.body_size}`)}<br />
          🌡 {v.temp_max > 0 ? `+${v.temp_max}` : v.temp_max}…{v.temp_min}°C {v.volume_m3 ? `· ${v.volume_m3} m³` : ""}
        </div>
      ) : <span className="hint small">🚛 —</span>}
      {d.reject_reason && d.status === "rejected" && <span className="hint small">❌ {d.reject_reason}</span>}

      <Button variant="secondary" onClick={showDocs} busy={busy === "docs"}>{t("a_show_docs")} ({d.docs_count}/4)</Button>
      {docs && (
        <div className="doc-imgs">
          {docs.map((x) => (
            <a key={x.type} href={x.url} target="_blank" rel="noreferrer">
              {x.url && <img src={x.url} alt={x.type} loading="lazy" />}
              <span>{t(`doc_${x.type}`)}</span>
            </a>
          ))}
        </div>
      )}

      {rejecting ? (
        <>
          <input className="input" placeholder={t("a_reject_reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="btn-row">
            <Button variant="secondary" onClick={() => setRejecting(false)}>{t("close")}</Button>
            <Button variant="danger" disabled={!reason.trim()} busy={busy === "reject"}
              onClick={() => run("reject", "admin_set_driver", { driver_id: d.user_id, status: "rejected", reason })}>
              {t("a_reject")}
            </Button>
          </div>
        </>
      ) : (
        <div className="btn-row">
          {d.status !== "approved" && (
            <Button busy={busy === "approve"}
              onClick={() => run("approve", "admin_set_driver", { driver_id: d.user_id, status: "approved" })}>
              {t("a_approve")}
            </Button>
          )}
          {d.status !== "rejected" && (
            <Button variant="danger" onClick={() => setRejecting(true)}>{t("a_reject")}</Button>
          )}
          <Button variant="secondary" busy={busy === "block"}
            onClick={() => run("block", "admin_block_user", { user_id: d.user_id, blocked: !d.is_blocked })}>
            {d.is_blocked ? t("a_unblock") : t("a_block")}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Drivers() {
  const t = useT();
  const [status, setStatus] = useState("pending");
  const { data, error, load } = useLoad("admin_drivers", { status }, [status]);
  return (
    <div className="page">
      <FilterRow value={status} onChange={setStatus} options={[
        ["pending", `⏳ ${t("a_pending")}`], ["approved", `✅ ${t("a_approved")}`], ["rejected", `❌ ${t("a_rejected")}`], ["all", t("a_all")],
      ]} />
      {error && <p className="error">{errText(t, error)}</p>}
      {!data && !error && <Loading />}
      {data?.length === 0 && <p className="hint text-center">—</p>}
      <div className="admin-list">
        {data?.map((d) => <DriverCard key={d.user_id} d={d} onChanged={load} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 4. Tariflar
// ---------------------------------------------------------------------
const CITY_FIELDS = ["base_price", "included_km", "price_per_km", "price_per_stop", "loader_price", "min_price",
  "free_wait_min", "price_per_wait_min", "frozen_surcharge_pct", "urgent_surcharge_pct", "commission_pct"];
const INTERCITY_FIELDS = ["intercity_coef", "min_price", "price_per_stop", "loader_price",
  "free_wait_min", "price_per_wait_min", "frozen_surcharge_pct", "urgent_surcharge_pct", "commission_pct"];

function TariffCard({ tariff, onSaved }) {
  const t = useT();
  const fields = tariff.kind === "city" ? CITY_FIELDS : INTERCITY_FIELDS;
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f, String(tariff[f] ?? 0)])));
  const [busy, setBusy] = useState(false);
  const changed = fields.some((f) => Number(form[f]) !== Number(tariff[f] ?? 0));

  const save = async () => {
    setBusy(true);
    try {
      const patch = Object.fromEntries(fields.map((f) => [f, Number(form[f])]));
      await api("admin_save_tariff", { id: tariff.id, ...patch });
      haptic("success");
      toast(t("a_saved"));
      await onSaved();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <b>{t(`kind_${tariff.kind}`)} · {t(`size_${tariff.body_size}`)}</b>
      <div className="tariff-grid">
        {fields.map((f) => (
          <label key={f} className="field">
            <span className="field-label">{t(`t_${f}`)}</span>
            <input className="input" type="number" inputMode="decimal" value={form[f]}
              onChange={(e) => setForm((x) => ({ ...x, [f]: e.target.value }))} />
          </label>
        ))}
      </div>
      <Button onClick={save} busy={busy} disabled={!changed}>{t("save")}</Button>
    </Card>
  );
}

function Tariffs() {
  const t = useT();
  const { data, error, load } = useLoad("admin_tariffs", {}, []);
  if (error) return <p className="error">{errText(t, error)}</p>;
  if (!data) return <Loading />;
  return (
    <div className="page">
      <div className="admin-list">
        {data.map((tr) => <TariffCard key={`${tr.id}-${tr.updated_at}`} tariff={tr} onSaved={load} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
export default function AdminApp({ onExit }) {
  const t = useT();
  const [tab, setTab] = useState("stats");
  const tabs = [["stats", `📊 ${t("a_stats")}`], ["orders", `📦 ${t("a_orders")}`],
    ["drivers", `🚚 ${t("a_drivers")}`], ["tariffs", `💰 ${t("a_tariffs")}`]];
  return (
    <div className="admin-wrap">
      <div className="page" style={{ paddingBottom: 0 }}>
        <div className="row-between">
          <h2>{t("admin_panel")}</h2>
          <button className="link-btn" onClick={onExit}>{t("exit_admin")}</button>
        </div>
      </div>
      <div className="admin-tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "orders" && <Orders />}
      {tab === "drivers" && <Drivers />}
      {tab === "tariffs" && <Tariffs />}
    </div>
  );
}
