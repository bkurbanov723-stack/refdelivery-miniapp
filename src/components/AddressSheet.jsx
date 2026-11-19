import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getRecent, reverseGeocode, saveRecent, searchPlaces } from "../geo";
import { useT } from "../i18n";
import { haptic } from "../tg";
import { Loading } from "../ui";
import { getPosition } from "../utils";

// Xarita faqat kerak bo'lganda yuklanadi — ilova tezroq ochiladi
const MapPicker = lazy(() => import("./MapPicker"));

// Manzil tanlash: avval yozib qidirish (tez), kerak bo'lsa xaritadan
export default function AddressSheet({ title, initial, near, onPick, onClose }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [recent] = useState(getRecent);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        setResults(await searchPlaces(q, near, ctrl.signal));
      } catch {
        /* bekor qilingan yoki tarmoq xatosi */
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, near]);

  const pick = (p) => {
    haptic("light");
    saveRecent(p);
    onPick(p);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getPosition();
      const address = await reverseGeocode(pos.lat, pos.lng);
      pick({ ...pos, address });
    } catch {
      setShowMap(true);
    } finally {
      setLocating(false);
    }
  };

  if (showMap) {
    return (
      <Suspense fallback={<div className="picker"><Loading /></div>}>
        <MapPicker
          title={title}
          initial={initial || near}
          onClose={() => setShowMap(false)}
          onPick={pick}
        />
      </Suspense>
    );
  }

  const list = query.trim().length >= 2 ? results : recent;

  return (
    <div className="picker">
      <div className="picker-head">
        <button className="link-btn" onClick={onClose}>{t("close")}</button>
        <b>{title}</b>
        <span style={{ width: 56 }} />
      </div>

      <div className="picker-search">
        <input
          ref={inputRef}
          className="input"
          placeholder={t("search_place")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sheet-list">
        <button className="sheet-row" onClick={useMyLocation} disabled={locating}>
          <span className="sheet-icon">📍</span>
          <span>{locating ? t("locating") : t("my_location").replace(/^📍\s*/, "")}</span>
        </button>
        <button className="sheet-row" onClick={() => setShowMap(true)}>
          <span className="sheet-icon">🗺</span>
          <span>{t("pick_on_map")}</span>
        </button>

        {query.trim().length < 2 && recent.length > 0 && <div className="sheet-caption">{t("recent")}</div>}
        {searching && <div className="sheet-caption">{t("searching")}</div>}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <div className="sheet-caption">{t("not_found_try_map")}</div>
        )}

        {list.map((r, i) => (
          <button key={i} className="sheet-row" onClick={() => pick(r)}>
            <span className="sheet-icon">{query.trim().length >= 2 ? "🔎" : "🕘"}</span>
            <span className="sheet-text">
              <span>{r.address}</span>
              {r.hint && <span className="hint small">{r.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
