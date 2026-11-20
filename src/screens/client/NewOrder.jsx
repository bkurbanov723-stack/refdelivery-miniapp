import { useMemo, useState } from "react";
import { api } from "../../api";
import AddressSheet from "../../components/AddressSheet";
import TempControl from "../../components/TempControl";
import { MAX_STOPS } from "../../config";
import { errText, useLang, useT } from "../../i18n";
import { haptic, toast } from "../../tg";
import { Button, Card, Field } from "../../ui";
import { estimatePrice, localInputValue, money, SIZES, sizeForWeight } from "../../utils";

export default function NewOrder({ refs, onCreated }) {
  const t = useT();
  const { lang } = useLang();

  // points[0] — olish joyi, oxirgisi — yakuniy manzil, o'rtadagilar — qo'shimcha nuqtalar
  const [points, setPoints] = useState([null, null]);
  const [editing, setEditing] = useState(null); // tahrirlanayotgan nuqta raqami
  const [cargoId, setCargoId] = useState("");
  const [weight, setWeight] = useState("");
  const [volume, setVolume] = useState("");
  const [tMin, setTMin] = useState(0);
  const [tMax, setTMax] = useState(4);
  const [pickup, setPickup] = useState(() => localInputValue(new Date(Date.now() + 30 * 60000)));
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [size, setSize] = useState(null);
  const [loaders, setLoaders] = useState(0);
  const [sending, setSending] = useState(false);

  const w = Number(weight);
  const need = sizeForWeight(w);
  const effSize = size && (!need || SIZES.indexOf(size) > SIZES.indexOf(need)) ? size : need;
  const ready = points.every(Boolean);
  const phoneDigits = recPhone.replace(/\D/g, "");
  const phoneOk = phoneDigits.length === 9 || (phoneDigits.length >= 11 && phoneDigits.length <= 15);

  // Narx darhol, serverga bormasdan hisoblanadi
  const est = useMemo(() => {
    if (!ready || !effSize || !(w > 0)) return null;
    return estimatePrice(refs, { points, body: effSize, tempMin: tMin, urgent, loaders });
  }, [ready, points, effSize, tMin, urgent, refs, w, loaders]);

  // Yuk ortuvchi narxi kuzovga bog'liq (manzillar hali tanlanmagan bo'lsa ham ko'rsatamiz)
  const loaderPrice = useMemo(() => {
    const tf = (refs.tariffs || []).find((x) => x.kind === "city" && x.body_size === (effSize || "small"));
    return Number(tf?.loader_price || 0);
  }, [refs, effSize]);

  const setPoint = (i, p) => setPoints((list) => list.map((x, k) => (k === i ? p : x)));
  const addStop = () => setPoints((list) => [...list.slice(0, -1), null, list[list.length - 1]]);
  const removeStop = (i) => setPoints((list) => list.filter((_, k) => k !== i));

  const onCargo = (id) => {
    setCargoId(id);
    const c = refs.cargo_types.find((x) => String(x.id) === String(id));
    if (c && c.default_temp_min != null) {
      setTMin(c.default_temp_min);
      setTMax(c.default_temp_max);
    }
  };

  const submit = async () => {
    if (!est?.price) return;
    setSending(true);
    try {
      const o = await api("create_order", {
        from: points[0],
        to: points[points.length - 1],
        stops: points.slice(1, -1),
        cargo_type_id: cargoId ? Number(cargoId) : null,
        weight_kg: w,
        volume_m3: volume ? Number(volume) : null,
        temp_min: tMin,
        temp_max: tMax,
        pickup_at: new Date(pickup).toISOString(),
        is_urgent: urgent,
        body_size: effSize,
        loaders,
        comment,
        recipient_name: recName,
        recipient_phone: recPhone,
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

  if (editing !== null) {
    const last = points.length - 1;
    const title = editing === 0 ? t("from") : editing === last ? t("to") : t("stop_n", { n: editing });
    return (
      <AddressSheet
        title={title}
        initial={points[editing]}
        near={points[editing] || points[0] || undefined}
        onClose={() => setEditing(null)}
        onPick={(p) => {
          setPoint(editing, p);
          setEditing(null);
        }}
      />
    );
  }

  const last = points.length - 1;
  let hint = t("fill_to_quote");
  if (ready && w > 0 && !need) hint = errText(t, { code: "TOO_HEAVY" });

  return (
    <div className="page">
      <Card>
        {points.map((p, i) => (
          <div key={i}>
            {i > 0 && <div className="divider" />}
            <div className="addr-line">
              <button className="addr-btn" onClick={() => setEditing(i)}>
                <span className={`dot ${i === 0 ? "dot-from" : i === last ? "dot-to" : "dot-stop"}`} />
                <span className="addr-text">
                  <span className="field-label">
                    {i === 0 ? t("from") : i === last ? t("to") : t("stop_n", { n: i })}
                  </span>
                  <span className={p ? "" : "hint"}>{p?.address || t("choose_address")}</span>
                </span>
              </button>
              {i > 0 && i < last && (
                <button className="remove-btn" onClick={() => removeStop(i)} aria-label="remove">✕</button>
              )}
            </div>
          </div>
        ))}
        {points.length - 2 < MAX_STOPS && (
          <button className="link-btn" onClick={addStop}>{t("add_stop")}</button>
        )}
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
          <TempControl min={tMin} max={tMax} onChange={(a, b) => { setTMin(a); setTMax(b); }} />
        </Field>

        <Field label={t("body")}>
          <div className="size-row">
            {SIZES.map((s) => {
              const disabled = need ? SIZES.indexOf(s) < SIZES.indexOf(need) : false;
              const [name, cap] = t(`size_${s}`).split(" · ");
              return (
                <button key={s} disabled={disabled}
                  className={`size-btn ${effSize === s ? "active" : ""}`}
                  onClick={() => setSize(s)}>
                  <b>{name}</b>
                  <span className="small">{cap}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("pickup_time")}>
          <input className="input" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} />
        </Field>

        <Field label={`${t("loaders")} · ${t("loader_each", { price: money(loaderPrice) })}`}>
          <div className="seg4">
            {[0, 1, 2, 3].map((n) => (
              <button key={n} type="button" className={`chip ${loaders === n ? "active" : ""}`} onClick={() => setLoaders(n)}>
                {n === 0 ? t("loaders_none") : t("loaders_n", { n })}
              </button>
            ))}
          </div>
        </Field>

        <label className="check">
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          <span>{t("urgent")}</span>
        </label>
      </Card>

      <Card>
        <Field label={t("recipient_required")} hint={t("recipient_phone_hint")}>
          <input className={`input ${recPhone && !phoneOk ? "input-bad" : ""}`} type="tel" inputMode="tel"
            value={recPhone} onChange={(e) => setRecPhone(e.target.value)} placeholder="+998 90 123 45 67" />
        </Field>
        <input className="input" value={recName} onChange={(e) => setRecName(e.target.value)} placeholder={t("recipient_name")} />
        <Field label={t("comment")}>
          <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
      </Card>

      <Card className="price-card">
        {est?.price ? (
          <>
            <div className="hint">{t(`kind_${est.kind}`)} · ≈{est.distanceKm} {t("km")}</div>
            <div className="price">{money(est.price)} {t("sum")}</div>
            {est.kind === "city" && (
              <div className="hint small">
                {t("price_note", { km: est.included, stop: money(est.perStop) })}
              </div>
            )}
            {est.waitPerMin > 0 && (
              <div className="hint small">{t("wait_note", { free: est.freeWait, price: money(est.waitPerMin) })}</div>
            )}
            <div className="hint small">{t("payment_cash")}</div>
          </>
        ) : (
          <p className="hint">{hint}</p>
        )}
      </Card>

      {est?.price && !phoneOk && <p className="error small text-center">{t("err_RECIPIENT_PHONE_REQUIRED")}</p>}
      <Button onClick={submit} busy={sending} disabled={!est?.price || !phoneOk}>
        {t("create_order")}
      </Button>
    </div>
  );
}
