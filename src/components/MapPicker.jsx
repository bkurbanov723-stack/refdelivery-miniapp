import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { TASHKENT } from "../config";
import { reverseGeocode, searchPlaces } from "../geo";
import { useLang, useT } from "../i18n";
import { getPosition } from "../utils";
import { haptic } from "../tg";
import { Button } from "../ui";

function MoveWatcher({ onMove }) {
  useMapEvents({ moveend: (e) => onMove(e.target.getCenter()) });
  return null;
}

// To'liq ekranli xarita: foydalanuvchi xaritani suradi, markazdagi 📍 tanlangan joy bo'ladi
export default function MapPicker({ title, initial, onPick, onClose }) {
  const t = useT();
  const { lang } = useLang();
  const start = initial || TASHKENT;
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(start);
  const [address, setAddress] = useState(initial?.address || "");
  const [geocoding, setGeocoding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const skipNextGeocode = useRef(!!initial);

  // Xarita to'xtagach, markazdagi nuqtaning manzilini olamiz
  useEffect(() => {
    if (skipNextGeocode.current) {
      skipNextGeocode.current = false;
      return;
    }
    let alive = true;
    setGeocoding(true);
    const timer = setTimeout(async () => {
      const a = await reverseGeocode(center.lat, center.lng, lang);
      if (alive) {
        setAddress(a);
        setGeocoding(false);
      }
    }, 500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [center.lat, center.lng, lang]);

  // Matn bo'yicha qidiruv
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const list = await searchPlaces(query.trim(), lang);
        if (alive) setResults(list);
      } catch {
        if (alive) setResults([]);
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, lang]);

  const goTo = (p, addr) => {
    if (addr) {
      skipNextGeocode.current = true;
      setAddress(addr);
    }
    setCenter({ lat: p.lat, lng: p.lng });
    map?.setView([p.lat, p.lng], 16);
  };

  const myLocation = async () => {
    try {
      const p = await getPosition();
      goTo(p);
    } catch {
      /* ruxsat berilmagan */
    }
  };

  const pick = () => {
    haptic("light");
    onPick({ lat: center.lat, lng: center.lng, address: address || `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}` });
  };

  return (
    <div className="picker">
      <div className="picker-head">
        <button className="link-btn" onClick={onClose}>{t("close")}</button>
        <b>{title}</b>
        <span style={{ width: 56 }} />
      </div>

      <div className="picker-search">
        <input
          className="input"
          placeholder={t("search_place")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className="results">
            {results.map((r, i) => (
              <button
                key={i}
                className="result"
                onClick={() => {
                  goTo(r, r.address);
                  setResults([]);
                  setQuery("");
                }}
              >
                {r.address}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="picker-map">
        <MapContainer
          ref={setMap}
          center={[start.lat, start.lng]}
          zoom={initial ? 16 : 12}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
          <MoveWatcher onMove={(c) => setCenter({ lat: c.lat, lng: c.lng })} />
        </MapContainer>
        <div className="center-pin">📍</div>
        <button className="locate-btn" onClick={myLocation}>{t("my_location")}</button>
      </div>

      <div className="picker-bottom">
        <span className="field-label">{t("address")}</span>
        <input
          className="input"
          value={geocoding ? "..." : address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Button onClick={pick} disabled={geocoding}>{t("pick_here")}</Button>
      </div>
    </div>
  );
}
