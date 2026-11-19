import { useState } from "react";
import { api } from "../../api";
import { errText, useT } from "../../i18n";
import { haptic, toast } from "../../tg";
import { Button, Card, Field } from "../../ui";
import { compressImage, sizeForWeight } from "../../utils";

const DOC_TYPES = ["license", "tech_passport", "vehicle_photo", "reefer_photo"];

function DocTile({ type, doc, onUploaded }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const data = await compressImage(file);
      await api("upload_document", { type, file: data });
      haptic("success");
      await onUploaded();
    } catch (err) {
      haptic("error");
      toast(errText(t, err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <label className={`doc-tile ${doc ? "done" : ""}`}>
      <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
      <span className="doc-name">{t(`doc_${type}`)}</span>
      <span className={doc ? "ok small" : "hint small"}>
        {busy ? t("uploading") : doc ? `${t("uploaded")} · ${t("reupload")}` : t("upload")}
      </span>
    </label>
  );
}

export default function DriverRegister({ me, reload }) {
  const t = useT();
  const v = me.vehicle;
  const [form, setForm] = useState({
    model: v?.model || "",
    plate_number: v?.plate_number || "",
    gross_weight_kg: v?.gross_weight_kg || "",
    curb_weight_kg: v?.curb_weight_kg || "",
    volume_m3: v?.volume_m3 || "",
    temp_min: v?.temp_min ?? "-18",
    temp_max: v?.temp_max ?? "5",
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const payload = Number(form.gross_weight_kg) - Number(form.curb_weight_kg);
  const size = payload > 0 ? sizeForWeight(payload) : null;

  const docs = Object.fromEntries((me.documents || []).map((d) => [d.type, d]));
  const complete = !!v && DOC_TYPES.every((d) => docs[d]);
  const status = me.driver?.status;

  const save = async () => {
    setSaving(true);
    try {
      await api("save_vehicle", {
        ...form,
        gross_weight_kg: Number(form.gross_weight_kg),
        curb_weight_kg: Number(form.curb_weight_kg),
        volume_m3: form.volume_m3 ? Number(form.volume_m3) : null,
        temp_min: Number(form.temp_min),
        temp_max: Number(form.temp_max),
      });
      haptic("success");
      toast(t("saved"));
      await reload();
    } catch (e) {
      haptic("error");
      toast(errText(t, e));
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await reload().catch(() => {});
    setRefreshing(false);
  };

  let banner;
  if (status === "rejected") banner = <p className="banner banner-danger">{t("reg_status_rejected", { reason: me.driver?.reject_reason || "—" })}</p>;
  else if (complete) banner = <p className="banner banner-info">{t("reg_status_pending")}</p>;
  else banner = <p className="banner">{t("reg_status_incomplete")}</p>;

  return (
    <div className="page">
      {banner}

      <Card>
        <h3>{t("vehicle_data")}</h3>
        <Field label={t("model")}>
          <input className="input" value={form.model} onChange={set("model")} placeholder="Isuzu NQR" />
        </Field>
        <Field label={t("plate")}>
          <input className="input upper" value={form.plate_number} onChange={set("plate_number")} placeholder="01A123BC" />
        </Field>
        <div className="grid-2">
          <Field label={t("gross")}>
            <input className="input" type="number" inputMode="numeric" value={form.gross_weight_kg} onChange={set("gross_weight_kg")} />
          </Field>
          <Field label={t("curb")}>
            <input className="input" type="number" inputMode="numeric" value={form.curb_weight_kg} onChange={set("curb_weight_kg")} />
          </Field>
        </div>

        {payload > 0 && (
          <div className={`payload ${size ? "" : "bad"}`}>
            {t("payload")}: <b>{payload} {t("kg")}</b>
            {size ? <> → <b>{t(`size_${size}`)}</b></> : <div className="small">{t("too_heavy_vehicle")}</div>}
          </div>
        )}

        <Field label={t("volume")}>
          <input className="input" type="number" inputMode="decimal" value={form.volume_m3} onChange={set("volume_m3")} />
        </Field>
        <Field label={t("reefer_temp")}>
          <div className="grid-2">
            <input className="input" type="number" value={form.temp_min} onChange={set("temp_min")} placeholder={t("temp_from")} />
            <input className="input" type="number" value={form.temp_max} onChange={set("temp_max")} placeholder={t("temp_to")} />
          </div>
        </Field>
        <Button onClick={save} busy={saving} disabled={!size || !form.model || !form.plate_number}>
          {t("save")}
        </Button>
      </Card>

      <Card>
        <h3>{t("documents")}</h3>
        <div className="doc-grid">
          {DOC_TYPES.map((type) => (
            <DocTile key={type} type={type} doc={docs[type]} onUploaded={reload} />
          ))}
        </div>
      </Card>

      <Button variant="secondary" onClick={refresh} busy={refreshing}>{t("refresh")}</Button>
    </div>
  );
}
