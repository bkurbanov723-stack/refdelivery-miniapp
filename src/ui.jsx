import { useEffect, useState } from "react";
import { useT } from "./i18n";

export function Loading({ text }) {
  const t = useT();
  return (
    <div className="center">
      <div className="spinner" />
      <p className="hint">{text || t("loading")}</p>
    </div>
  );
}

export function Message({ children, action }) {
  return (
    <div className="center">
      <div className="message">{children}</div>
      {action}
    </div>
  );
}

export function Button({ children, variant = "primary", busy, disabled, className = "", ...rest }) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={disabled || busy} {...rest}>
      {busy ? <span className="spinner small" /> : children}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Card({ children, onClick, className = "" }) {
  return (
    <div className={`card ${onClick ? "clickable" : ""} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  const t = useT();
  return <span className={`badge badge-${status}`}>{t(`status_${status}`)}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab ${value === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Toaster() {
  const [text, setText] = useState(null);
  useEffect(() => {
    let timer;
    const onToast = (e) => {
      setText(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setText(null), 3500);
    };
    window.addEventListener("rd-toast", onToast);
    return () => {
      window.removeEventListener("rd-toast", onToast);
      clearTimeout(timer);
    };
  }, []);
  return text ? <div className="toast">{text}</div> : null;
}

// Manzillar (qayerdan → qayerga) ko'rinishi
export function Route({ order }) {
  return (
    <div className="route">
      <div className="route-row">
        <span className="dot dot-from" />
        <span>{order.from_address}</span>
      </div>
      {(order.stops || []).map((s, i) => (
        <div key={i} className="route-row">
          <span className="dot dot-stop" />
          <span>{s.address}</span>
        </div>
      ))}
      <div className="route-row">
        <span className="dot dot-to" />
        <span>{order.to_address}</span>
      </div>
    </div>
  );
}

// Buyurtmaning qisqa ma'lumotlari: og'irlik, harorat, kuzov, masofa
export function OrderFacts({ order }) {
  const t = useT();
  return (
    <div className="facts">
      <span>⚖️ {order.weight_kg} {t("kg")}</span>
      <span>🌡 {order.temp_min}…{order.temp_max}°C</span>
      <span>🚛 {t(`size_${order.body_size}`).split(" · ")[0]}</span>
      {order.distance_km != null && <span>📏 {order.distance_km} {t("km")}</span>}
      <span>{t(`kind_${order.kind}`)}</span>
      {order.is_urgent && <span className="urgent">⚡</span>}
    </div>
  );
}
