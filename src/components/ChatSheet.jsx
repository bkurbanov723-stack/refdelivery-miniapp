import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { errText, useLang, useT } from "../i18n";
import { haptic } from "../tg";

const fmtTime = (iso) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

// Buyurtma chati: mijoz va haydovchi raqamsiz yozishadi (Yandex'dagidek)
export default function ChatSheet({ orderId, title, onClose }) {
  const t = useT();
  const { lang } = useLang();
  const [messages, setMessages] = useState([]);
  const [canWrite, setCanWrite] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const lastId = useRef(0);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await api("chat_list", { order_id: orderId, after_id: lastId.current });
      setCanWrite(r.can_write);
      if (r.messages.length) {
        lastId.current = r.messages[r.messages.length - 1].id;
        setMessages((list) => [...list, ...r.messages.filter((m) => !list.some((x) => x.id === m.id))]);
      }
    } catch (e) {
      setError(e);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    setError(null);
    try {
      const m = await api("chat_send", { order_id: orderId, text: msg });
      setText("");
      lastId.current = Math.max(lastId.current, m.id);
      setMessages((list) => [...list, m]);
      haptic("light");
    } catch (e) {
      haptic("error");
      setError(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="picker">
      <div className="picker-head">
        <button className="link-btn" onClick={onClose}>{t("back")}</button>
        <b>💬 {title}</b>
        <span style={{ width: 56 }} />
      </div>
      <div className="chat-note">{t("chat_rule")}</div>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="hint text-center small">{t("chat_empty")}</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.mine ? "mine" : ""}`}>
            {!m.mine && <span className="bubble-from">{t(`chat_from_${m.from}`)}</span>}
            <span>{m.text}</span>
            <span className="bubble-time">{fmtTime(m.created_at, lang)}</span>
          </div>
        ))}
      </div>

      {error && <p className="error small text-center" style={{ margin: "4px 12px" }}>{errText(t, error)}</p>}
      {canWrite ? (
        <div className="chat-input">
          <textarea
            className="input"
            rows={1}
            placeholder={t("chat_placeholder")}
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="chat-send" onClick={send} disabled={sending || !text.trim()}>➤</button>
        </div>
      ) : (
        <p className="hint small text-center" style={{ padding: 12 }}>{t("chat_closed")}</p>
      )}
    </div>
  );
}
