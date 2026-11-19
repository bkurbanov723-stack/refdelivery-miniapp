import { useLang, useT } from "../i18n";
import { haptic } from "../tg";

const PRESETS = [
  { id: "frozen", min: -25, max: -18 },
  { id: "chilled", min: 0, max: 4 },
  { id: "cool", min: 2, max: 8 },
  { id: "fresh", min: 4, max: 12 },
];

const LABELS = {
  uz: { warm: "🌡 Eng iliq", cold: "❄️ Eng sovuq" },
  ru: { warm: "🌡 Самая тёплая", cold: "❄️ Самая холодная" },
};

const LIMIT_MIN = -30;
const LIMIT_MAX = 30;
const show = (v) => (v > 0 ? `+${v}` : String(v));

// Bitta qiymat: [−] -18° [+]. Telefon klaviaturasida minus bo'lmagani uchun tugmalar bilan.
// lo/hi — bu qiymat chiqa olmaydigan chegaralar (ikkinchi qiymatni surmaydi, shunchaki to'xtaydi)
function Stepper({ label, value, lo, hi, onChange }) {
  const step = (d) => {
    const next = value + d;
    if (next < lo || next > hi) return;
    haptic("light");
    onChange(next);
  };
  return (
    <div className="stepper">
      <span className="field-label">{label}</span>
      <div className="stepper-row">
        <button type="button" onClick={() => step(-1)} disabled={value <= lo}>−</button>
        <span className="stepper-value">{show(value)}°</span>
        <button type="button" onClick={() => step(1)} disabled={value >= hi}>+</button>
      </div>
    </div>
  );
}

// Harorat tanlash: chapda eng iliq (+), o'ngda eng sovuq (−). Har biri mustaqil o'zgaradi.
export default function TempControl({ min, max, onChange, presets = true }) {
  const t = useT();
  const { lang } = useLang();
  const L = LABELS[lang] || LABELS.uz;

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
              <span className="hint small"> {show(p.max)}…{show(p.min)}°</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid-2">
        <Stepper label={L.warm} value={max} lo={min} hi={LIMIT_MAX} onChange={(v) => onChange(min, v)} />
        <Stepper label={L.cold} value={min} lo={LIMIT_MIN} hi={max} onChange={(v) => onChange(v, max)} />
      </div>
    </div>
  );
}
