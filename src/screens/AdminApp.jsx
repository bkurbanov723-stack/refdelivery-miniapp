import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { errText, useLang, useT } from "../i18n";
import { askConfirm, haptic, toast } from "../tg";
import { Button, Card, Loading, OrderFacts, Route, StatusBadge } from "../ui";
import { fmtDate, money } from "../utils";

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
const DOC_TYPES = ["license", "tech_passport", "vehicle_photo", "reefer_photo"];

// Bu bo'limdagi yangi matnlar (ikki tilda)
const L = {
  uz: {
    incomplete: "📝 To'ldirilmagan",
    pending: "⏳ Tekshiruvda",
    vehicle: "Mashina ma'lumoti",
    missing: "Yuklanmagan",
    no_vehicle: "Mashina ma'lumoti kiritilmagan",
    request_fix: "📩 Tuzatishni so'rash",
    fix_title: "Haydovchiga nimani to'g'rilash yoki yuklashni aytamiz?",
    fix_comment: "Qo'shimcha izoh (ixtiyoriy)",
    fix_send: "📩 Haydovchiga yuborish",
    fix_sent: "Haydovchiga xabar yuborildi ✅",
    no_docs: "Haydovchi hali hujjat yuklamagan",
    approve_hint: "Tasdiqlash uchun mashina ma'lumoti va 4 ta hujjat kerak",
  },
  ru: {
    incomplete: "📝 Не заполнено",
    pending: "⏳ На проверке",
    vehicle: "Данные машины",
    missing: "Не загружено",
    no_vehicle: "Данные машины не заполнены",
    request_fix: "📩 Запросить исправление",
    fix_title: "Что водителю нужно исправить или загрузить?",
    fix_comment: "Комментарий (необязательно)",
    fix_send: "📩 Отправить водителю",
    fix_sent: "Сообщение водителю отправлено ✅",
    no_docs: "Водитель ещё не загрузил документы",
    approve_hint: "Для подтверждения нужны данные машины и 4 документа",
  },
};
const DOC_ICON = { approved: "✅", pending: "⏳", rejected: "❌" };

function DriverCard({ d, onChanged }) {
  const t = useT();
  const { lang } = useLang();
  const l = L[lang] || L.uz;
  const [busy, setBusy] = useState(null);
  const [docs, setDocs] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const v = d.vehicle;

  const docMap = Object.fromEntries((d.docs || []).map((x) => [x.type, x]));
  const complete = !!v && DOC_TYPES.every((x) => docMap[x]);
  const missingItems = [...(v ? [] : ["vehicle"]), ...DOC_TYPES.filter((x) => !docMap[x] || docMap[x].status === "rejected")];

  const [fixing, setFixing] = useState(false);
  const [fixItems, setFixItems] = useState([]);
  const [fixComment, setFixComment] = useState("");

  const run = async (key, action, params, okText) => {
    setBusy(key);
    try {
      await api(action, params);
      haptic("success");
      if (okText) toast(okText);
      await onChanged();
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const showDocs = async () => {
    if (docs) return setDocs(null);
    if (!d.docs_count) {
      setDocs([]);
      return;
    }
    setBusy("docs");
    try {
      setDocs(await api("admin_driver_docs", { driver_id: d.user_id }));
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(null);
    }
  };

  const openFix = () => {
    setFixItems(missingItems);
    setFixComment("");
    setFixing(true);
    setRejecting(false);
  };
  const toggleItem = (x) => setFixItems((list) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]));

  let statusLabel;
  if (d.status === "approved") statusLabel = `✅ ${t("a_approved")}`;
  else if (d.status === "rejected") statusLabel = `❌ ${t("a_rejected")}`;
  else statusLabel = complete ? l.pending : l.incomplete;

  return (
    <Card>
      <div className="row-between">
        <b>{d.name || "—"}</b>
        <span className="small">{statusLabel}{d.is_blocked ? ` · 🚫 ${t("a_blocked")}` : ""}</span>
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
      ) : <span className="hint small">🚛 {l.no_vehicle}</span>}

      {/* Hujjatlar holati: ✅ tasdiqlangan, ⏳ tekshiruvda, ❌ rad etilgan, ➖ yuklanmagan */}
      <div className="facts">
        {DOC_TYPES.map((x) => (
          <span key={x}>{docMap[x] ? DOC_ICON[docMap[x].status] || "⏳" : "➖"} {t(`doc_${x}`).split(" (")[0]}</span>
        ))}
      </div>
      {d.reject_reason && d.status === "rejected" && <span className="hint small">❌ {d.reject_reason}</span>}

      <Button variant="secondary" onClick={showDocs} busy={busy === "docs"}>{t("a_show_docs")} ({d.docs_count}/4)</Button>
      {docs && (
        docs.length === 0 && !d.docs_count ? (
          <p className="hint small text-center">{l.no_docs}</p>
        ) : (
          <div className="doc-imgs">
            {DOC_TYPES.map((type) => {
              const x = docs.find((y) => y.type === type);
              return x?.url ? (
                <a key={type} href={x.url} target="_blank" rel="noreferrer">
                  <img src={x.url} alt={type} loading="lazy" />
                  <span>{DOC_ICON[x.status] || "⏳"} {t(`doc_${type}`)}</span>
                </a>
              ) : (
                <div key={type} className="doc-missing">
                  <span>➖</span>
                  <span className="small">{t(`doc_${type}`)}<br />{l.missing}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {fixing ? (
        <div className="fix-box">
          <b className="small">{l.fix_title}</b>
          {["vehicle", ...DOC_TYPES].map((x) => (
            <label key={x} className="check small">
              <input type="checkbox" checked={fixItems.includes(x)} onChange={() => toggleItem(x)} />
              <span>{x === "vehicle" ? l.vehicle : t(`doc_${x}`)}</span>
            </label>
          ))}
          <input className="input" placeholder={l.fix_comment} value={fixComment} onChange={(e) => setFixComment(e.target.value)} />
          <div className="btn-row">
            <Button variant="secondary" onClick={() => setFixing(false)}>{t("close")}</Button>
            <Button busy={busy === "fix"} disabled={!fixItems.length && !fixComment.trim()}
              onClick={() => run("fix", "admin_request_fix",
                { driver_id: d.user_id, items: fixItems, comment: fixComment }, l.fix_sent).then(() => setFixing(false))}>
              {l.fix_send}
            </Button>
          </div>
        </div>
      ) : rejecting ? (
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
        <>
          {d.status !== "approved" && (
            complete ? (
              <Button busy={busy === "approve"}
                onClick={() => run("approve", "admin_set_driver", { driver_id: d.user_id, status: "approved" })}>
                {t("a_approve")}
              </Button>
            ) : <span className="hint small text-center">{l.approve_hint}</span>
          )}
          <Button variant="secondary" onClick={openFix}>{l.request_fix}</Button>
          <div className="btn-row">
            {d.status !== "rejected" && (
              <Button variant="danger" onClick={() => setRejecting(true)}>{t("a_reject")}</Button>
            )}
            <Button variant="secondary" busy={busy === "block"}
              onClick={() => run("block", "admin_block_user", { user_id: d.user_id, blocked: !d.is_blocked })}>
              {d.is_blocked ? t("a_unblock") : t("a_block")}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function Drivers() {
  const t = useT();
  const { lang } = useLang();
  const l = L[lang] || L.uz;
  const [filter, setFilter] = useState("pending");
  const apiStatus = filter === "incomplete" ? "pending" : filter;
  const { data, error, load } = useLoad("admin_drivers", { status: apiStatus }, [apiStatus]);

  // Tekshiruvdagilarni ikkiga ajratamiz: to'liq to'ldirganlar va to'ldirmaganlar
  const isComplete = (d) => !!d.vehicle && DOC_TYPES.every((x) => (d.docs || []).some((y) => y.type === x));
  let list = data;
  if (data && filter === "pending") list = data.filter(isComplete);
  if (data && filter === "incomplete") list = data.filter((d) => !isComplete(d));

  return (
    <div className="page">
      <FilterRow value={filter} onChange={setFilter} options={[
        ["pending", l.pending], ["incomplete", l.incomplete], ["approved", `✅ ${t("a_approved")}`],
        ["rejected", `❌ ${t("a_rejected")}`], ["all", t("a_all")],
      ]} />
      {error && <p className="error">{errText(t, error)}</p>}
      {!data && !error && <Loading />}
      {list?.length === 0 && <p className="hint text-center">—</p>}
      <div className="admin-list">
        {list?.map((d) => <DriverCard key={d.user_id} d={d} onChanged={load} />)}
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
// Admin panel ekranga sig'ishi uchun: hamma narsa yonga emas, pastga qarab joylashadi
const ADMIN_CSS = `
.app > * { min-width: 0; }
.admin-wrap { width: 100%; min-width: 0; overflow-x: hidden; }
.admin-wrap .admin-tabs { min-width: 0; flex-wrap: wrap; overflow: visible; }
.admin-wrap .admin-tabs button { padding: 7px 12px; font-size: 13px; }
.admin-wrap .row-between { flex-wrap: wrap; }
.admin-wrap .stat-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
.admin-wrap .stat b { font-size: 18px; word-break: break-word; }
.admin-wrap .tariff-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
.admin-wrap .btn-row .btn { min-width: 0; }
.admin-wrap .card { min-width: 0; overflow-wrap: anywhere; }
.admin-wrap .doc-missing { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  height: 120px; border: 1.5px dashed var(--line); border-radius: 10px; text-align: center; color: var(--hint); }
.admin-wrap .fix-box { display: flex; flex-direction: column; gap: 8px; background: var(--bg); border-radius: 12px; padding: 10px; }
@media (max-width: 699px) { .admin-wrap .admin-list { display: flex; flex-direction: column; gap: 10px; } }
`;

export default function AdminApp({ onExit }) {
  const t = useT();
  const [tab, setTab] = useState("stats");
  const tabs = [["stats", `📊 ${t("a_stats")}`], ["orders", `📦 ${t("a_orders")}`],
    ["drivers", `🚚 ${t("a_drivers")}`], ["tariffs", `💰 ${t("a_tariffs")}`]];
  return (
    <div className="admin-wrap">
      <style>{ADMIN_CSS}</style>
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
