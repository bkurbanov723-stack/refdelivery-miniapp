import { useEffect, useState } from "react";
import { api } from "../../api";
import MapPicker from "../../components/MapPicker";
import { errText, useLang, useT } from "../../i18n";
import { haptic, toast } from "../../tg";
import { Button, Card, Field } from "../../ui";
import { localInputValue, money, SIZES, sizeForWeight } from "../../utils";

export default function NewOrder({ refs, onCreated }) {
  const t = useT();
  const { lang } = useLang();

  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [picker, setPicker] = useState(null); // "from" | "to" | null
  const [cargoId, setCargoId] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [tMin, setTMin] = useState("0");
  const [tMax, setTMax] = useState("4");
  const [pickup, setPickup] = useState(() => localInputValue(new Date(Date.now() + 30 * 60000)));
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [size, setSize] = useState(null);

  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [sending, setSending] = useState(false);

  const w = Number(weight);
  const need = sizeForWeight(w);
  const effSize = size && need && SIZES.indexOf(size) > SIZES.indexOf(need) ? size : need;

  // Ma'lumot o'zgarganda narxni qayta hisoblaymiz
  useEffect(() => {
    setQuote(null);
    setQuoteErr(null);
    setQuoting(false);
    if (!from || !to || !(w > 0) || tMin === "" || tMax === "") return;
    if (!need) {
      setQuoteErr({ code: "TOO_HEAVY" });
      return;
    }
    let alive = true;
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const q = await api("quote", {
          from, to, weight_kg: w, temp_min: Number(tMin), temp_max: Number(tMax),
          is_urgent: urgent, body_size: effSize,
        });
        if (alive) setQuote(q);
      } catch (e) {
        if (alive) setQuoteErr(e);
      } finally {
        if (alive) setQuoting(false);
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [from, to, w, tMin, tMax, urgent, effSize, need]);

  const onCargo = (id) => {
    setCargoId(id);
    const c = refs.cargo_types.find((x) => String(x.id) === String(id));
    if (c && c.default_temp_min != null) {
      setTMin(String(c.default_temp_min));
      setTMax(String(c.default_temp_max));
    }
  };

  const submit = async () => {
    if (!quote) return;
    setSending(true);
    try {
      const o = await api("create_order", {
        from, to,
        cargo_type_id: cargoId ? Number(cargoId) : null,
        weight_kg: w,
        volume_m3: volume ? Number(volume) : null,
        temp_min: Number(tMin),
        temp_max: Number(tMax),
        pickup_at: new Date(pickup).toISOString(),
        is_urgent: urgent,
        body_size: effSize,
        comment,
      });
      haptic("success");
      toast(t("order_created"));
      onCreated(o.id);
    } catch (e) {
      haptic("error");
      toast(errText(t, e));
    } finally {
      setSending(false);
    }
  };

  if (picker) {
    return (
      <MapPicker
        title={picker === "from" ? t("from") : t("to")}
        initial={picker === "from" ? from : to}
        onClose={() => setPicker(null)}
        onPick={(p) => {
          if (picker === "from") setFrom(p);
          else setTo(p);
          setPicker(null);
        }}
      />
    );
  }

  return (
    <div className="page">
      <Card>
        <button className="addr-btn" onClick={() => setPicker("from")}>
          <span className="dot dot-from" />
          <span className="addr-text">
            <span className="field-label">{t("from")}</span>
            <span className={from ? "" : "hint"}>{from?.address || t("choose_on_map")}</span>
          </span>
        </button>
        <div className="divider" />
        <button className="addr-btn" onClick={() => setPicker("to")}>
          <span className="dot dot-to" />
          <span className="addr-text">
            <span className="field-label">{t("to")}</span>
            <span className={to ? "" : "hint"}>{to?.address || t("choose_on_map")}</span>
          </span>
        </button>
      </Card>

      <Card>
        <Field label={t("cargo_type")}>
          <select className="input" value={cargoId} onChange={(e) => onCargo(e.target.value)}>
            <option value="">{t("choose")}</option>
            {refs.cargo_types.map((c) => (
              <option key={c.id} value={c.id}>{lang === "ru" ? c.name_ru : c.name_uz}</option>
            ))}
          </select>
        </Field>

        <div className="grid-2">
          <Field label={t("weight")}>
            <input className="input" type="number" inputMode="numeric" min="1" value={weight}
              onChange={(e) => setWeight(e.target.value)} placeholder="500" />
          </Field>
          <Field label={t("volume")}>
            <input className="input" type="number" inputMode="decimal" min="0" value={volume}
              onChange={(e) => setVolume(e.target.value)} placeholder="—" />
          </Field>
        </div>

        <Field label={t("temperature")}>
          <div className="grid-2">
            <input className="input" type="number" inputMode="numeric" value={tMin}
              onChange={(e) => setTMin(e.target.value)} placeholder={t("temp_from")} />
            <input className="input" type="number" inputMode="numeric" value={tMax}
              onChange={(e) => setTMax(e.target.value)} placeholder={t("temp_to")} />
          </div>
        </Field>

        <Field label={t("body")}>
          <div className="chips">
            {SIZES.map((s) => {
              const disabled = need ? SIZES.indexOf(s) < SIZES.indexOf(need) : false;
              return (
                <button key={s} disabled={disabled}
                  className={`chip ${effSize === s ? "active" : ""}`}
                  onClick={() => setSize(s)}>
                  {t(`size_${s}`)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("pickup_time")}>
          <input className="input" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
        </Field>

        <label className="check">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <span>{t("urgent")}</span>
        </label>

        <Field label={t("comment")}>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </Card>

      <Card className="price-card">
        {quote ? (
          <>
            <div className="row-between">
              <span className="hint">{t(`kind_${quote.kind}`)} · {quote.distance_km} {t("km")}</span>
              <span className="hint">{t(`size_${quote.body_size}`).split(" · ")[0]}</span>
            </div>
            <div className="price">{money(quote.price)} {t("sum")}</div>
            <div className="hint small">{t("payment_cash")}</div>
          </>
        ) : quoteErr ? (
          <p className="error">{errText(t, quoteErr)}</p>
        ) : (
          <p className="hint">{quoting ? t("calculating") : t("fill_to_quote")}</p>
        )}
      </Card>

      <Button onClick={submit} busy={sending} disabled={!quote || quoting}>
        {t("create_order")}
      </Button>
    </div>
  );
}
