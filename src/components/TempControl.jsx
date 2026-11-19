import { useT } from "../i18n";
import { haptic } from "../tg";

const PRESETS = [
  { id: "frozen", min: -25, max: -18 },
  { id: "chilled", min: 0, max: 4 },
  { id: "cool", min: 2, max: 8 },
  { id: "fresh", min: 4, max: 12 },
];

const clamp = (v) => Math.max(-30, Math.min(30, v));
const show = (v) => (v > 0 ? `+${v}` : String(v));

// Bitta qiymat: [−] -18 [+]. Telefon klaviaturasida minus bo'lmagani uchun tugmalar bilan
function Stepper({ label, value, onChange }) {
  const step = (d) => {
    haptic("light");
    onChange(clamp(value + d));
  };
  return (
    <div className="stepper">
      <span className="field-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => step(-1)}>−</button>
        <span className="stepper-value">{show(value)}°</span>
        <button type="button" onClick={() => step(1)}>+</button>
      </div>
    </div>
  );
}

// Harorat tanlash: tayyor variantlar + aniq sozlash
export default function TempControl({ min, max, onChange, presets = true }) {
  const t = useT();
  const setMin = (v) => onChange(v, Math.max(v, max));
  const setMax = (v) => onChange(Math.min(min, v), v);

  return (
    <div className="temp-control">
      {presets && (
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip chip-sm ${min === p.min && max === p.max ? "active" : ""}`}
              onClick={() => {
                haptic("light");
                onChange(p.min, p.max);
              }}
            >
              {t(`temp_${p.id}`)}
              <span className="hint small"> {show(p.min)}…{show(p.max)}°</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid-2">
        <Stepper label={t("temp_from")} value={min} onChange={setMin} />
        <Stepper label={t("temp_to")} value={max} onChange={setMax} />
      </div>
    </div>
  );
}
