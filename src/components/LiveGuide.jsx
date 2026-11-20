import { useState } from "react";
import { BOT_USERNAME } from "../config";
import { useLang } from "../i18n";
import { openLink, tg } from "../tg";

// Haydovchiga jonli joylashuvni (translatsiya) qanday yoqishni bosqichma-bosqich ko'rsatadi
const TXT = {
  uz: {
    title: "📡 Jonli joylashuvni yoqing",
    why: "Shunda yaqin atrofdagi buyurtmalar sizga chiqadi va mijoz sizni xaritada ko'radi.",
    steps: [
      "Pastdagi «Botni ochish» tugmasini bosing",
      "Bot chatida 📎 (skrepka) belgisini bosing",
      "«Geolokatsiya» (Локация / Location) ni tanlang",
      "«Jonli joylashuvni ulashish» (Транслировать геопозицию) ni bosing",
      "Muddatni tanlang: 8 soat",
      "Ilovaga qayting — tayyor ✅",
    ],
    note: "Telefon ekrani o'chsa ham ishlaydi. Har kuni ish boshida bir marta yoqing.",
    open: "🤖 Botni ochish",
    hide: "Yashirish",
    show: "📡 Jonli joylashuvni qanday yoqaman?",
  },
  ru: {
    title: "📡 Включите трансляцию геопозиции",
    why: "Тогда вам будут приходить заказы рядом, а клиент увидит вас на карте.",
    steps: [
      "Нажмите кнопку «Открыть бота» ниже",
      "В чате с ботом нажмите 📎 (скрепку)",
      "Выберите «Геопозиция»",
      "Нажмите «Транслировать геопозицию»",
      "Выберите срок: 8 часов",
      "Вернитесь в приложение — готово ✅",
    ],
    note: "Работает даже при выключенном экране. Включайте один раз в начале рабочего дня.",
    open: "🤖 Открыть бота",
    hide: "Скрыть",
    show: "📡 Как включить трансляцию геопозиции?",
  },
};

const KEY = "live_guide_hidden";
const readHidden = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export default function LiveGuide() {
  const { lang } = useLang();
  const x = TXT[lang] || TXT.uz;
  const [hidden, setHidden] = useState(readHidden);

  const setH = (v) => {
    setHidden(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* xotira bo'lmasa ham ishlayveradi */
    }
  };

  const openBot = () => {
    const url = `https://t.me/${BOT_USERNAME}`;
    try {
      if (tg?.openTelegramLink) return tg.openTelegramLink(url);
    } catch {
      /* oddiy havola */
    }
    openLink(url);
  };

  if (hidden) {
    return <button className="link-btn" onClick={() => setH(false)}>{x.show}</button>;
  }

  return (
    <div className="live-box">
      <div className="row-between">
        <b>{x.title}</b>
        <button className="link-btn small" onClick={() => setH(true)}>{x.hide}</button>
      </div>
      <span className="hint small">{x.why}</span>
      <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
        {x.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <span className="hint small">{x.note}</span>
      <button className="btn btn-primary" onClick={openBot}>{x.open}</button>
    </div>
  );
}
