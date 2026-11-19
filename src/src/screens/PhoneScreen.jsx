import { useState } from "react";
import { api } from "../api";
import { useT } from "../i18n";
import { haptic, tg } from "../tg";
import { Button } from "../ui";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PhoneScreen({ reload }) {
  const t = useT();
  const [state, setState] = useState("idle"); // idle | wait | failed

  const waitForPhone = async () => {
    // Bot ham raqamni saqlaydi — bir necha marta tekshirib ko'ramiz
    for (let i = 0; i < 6; i++) {
      const me = await reload().catch(() => null);
      if (me?.user?.phone) return true;
      await sleep(1500);
    }
    return false;
  };

  const ask = () => {
    if (!tg?.requestContact) {
      setState("failed");
      return;
    }
    tg.requestContact(async (sent, result) => {
      if (!sent) return;
      setState("wait");
      if (result?.response) {
        await api("save_phone", { response: result.response }).catch(() => null);
      }
      const ok = await waitForPhone();
      haptic(ok ? "success" : "error");
      if (!ok) setState("failed");
    });
  };

  return (
    <div className="page center">
      <div className="hero">📱</div>
      <h2>{t("phone_title")}</h2>
      <p className="hint">{t("phone_text")}</p>
      {state === "failed" && <p className="error">{t("phone_failed")}</p>}
      <Button onClick={ask} busy={state === "wait"}>{t("phone_btn")}</Button>
      {state === "wait" && <p className="hint">{t("phone_wait")}</p>}
    </div>
  );
}
