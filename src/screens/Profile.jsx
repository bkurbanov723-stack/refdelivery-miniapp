import { useState } from "react";
import { api } from "../api";
import { errText, useLang, useT } from "../i18n";
import { toast } from "../tg";
import { Button, Card } from "../ui";

export default function Profile({ me, mode, switchMode }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [busy, setBusy] = useState(false);
  const v = me.vehicle;

  const changeLang = async (language) => {
    if (language === lang) return;
    setLang(language);
    api("set_language", { language }).catch(() => {});
  };

  const doSwitch = async () => {
    setBusy(true);
    try {
      await switchMode(mode === "client" ? "driver" : "client");
    } catch (e) {
      toast(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Card>
        <div className="row-between">
          <span className="hint">{t("name")}</span>
          <b>{me.user.full_name || "—"}</b>
        </div>
        <div className="row-between">
          <span className="hint">{t("phone")}</span>
          <b>{me.user.phone || "—"}</b>
        </div>
      </Card>

      <Card>
        <span className="field-label">{t("language")}</span>
        <div className="segmented">
          <button className={lang === "uz" ? "active" : ""} onClick={() => changeLang("uz")}>🇺🇿 O'zbekcha</button>
          <button className={lang === "ru" ? "active" : ""} onClick={() => changeLang("ru")}>🇷🇺 Русский</button>
        </div>
      </Card>

      {mode === "driver" && v && (
        <Card>
          <span className="field-label">{t("my_vehicle")}</span>
          <b>{v.model} · {v.plate_number}</b>
          <div className="hint">
            {t(`size_${v.body_size}`)} · {v.temp_min}…{v.temp_max}°C
          </div>
        </Card>
      )}

      <Button variant="secondary" onClick={doSwitch} busy={busy}>
        {mode === "client" ? t("switch_to_driver") : t("switch_to_client")}
      </Button>

      <p className="hint text-center small">RefDelivery · v1.0</p>
    </div>
  );
}
