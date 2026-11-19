import { useState } from "react";
import { errText, useT } from "../i18n";
import { toast } from "../tg";
import { Card } from "../ui";

export default function RoleScreen({ onChoose }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const choose = async (role) => {
    if (busy) return;
    setBusy(true);
    try {
      await onChoose(role);
    } catch (e) {
      toast(errText(t, e));
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="hero">❄️</div>
      <h2 className="text-center">{t("role_title")}</h2>
      <Card onClick={() => choose("client")} className="role-card">
        <b>{t("role_client")}</b>
        <span className="hint">{t("role_client_d")}</span>
      </Card>
      <Card onClick={() => choose("driver")} className="role-card">
        <b>{t("role_driver")}</b>
        <span className="hint">{t("role_driver_d")}</span>
      </Card>
      {busy && <div className="spinner" />}
    </div>
  );
}
