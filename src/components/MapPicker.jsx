import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { TASHKENT, TILE_ATTRIBUTION, TILE_URL } from "../config";
import { reverseGeocode } from "../geo";
import { useT } from "../i18n";
import { haptic } from "../tg";
import { Button } from "../ui";
import { getPosition } from "../utils";

function MapEvents({ onMove }) {
  const map = useMapEvents({
    moveend: () => onMove(map.getCenter()),
    // Xaritaga bosilsa — o'sha joy markazga keladi
    click: (e) => map.flyTo(e.latlng, Math.max(map.getZoom(), 16), { duration: 0.3 }),
  });
  return null;
}

// To'liq ekranli xarita: xaritani surasiz yoki bosasiz, markazdagi 📍 tanlangan joy
export default function MapPicker({ title, initial, onPick, onClose }) {
  const t = useT();
  const start = initial || TASHKENT;
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(start);
  const [address, setAddress] = useState(initial?.address || "");
  const [geocoding, setGeocoding] = useState(false);
  const skipNext = useRef(!!initial?.address);
  const autoLocated = useRef(!!initial);

  // Boshlang'ich nuqta berilmagan bo'lsa — foydalanuvchi joylashuviga o'tamiz
  useEffect(() => {
    if (!map || autoLocated.current) return;
    autoLocated.current = true;
    getPosition().then((p) => map.setView([p.lat, p.lng], 16)).catch(() => {});
  }, [map]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    let alive = true;
    setGeocoding(true);
    const timer = setTimeout(async () => {
      const a = await reverseGeocode(center.lat, center.lng);
      if (alive) {
        setAddress(a);
        setGeocoding(false);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [center.lat, center.lng]);

  const myLocation = async () => {
    try {
      const p = await getPosition();
      map?.flyTo([p.lat, p.lng], 17, { duration: 0.4 });
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
        <button className="link-btn" onClick={onClose}>{t("back")}</button>
        <b>{title}</b>
        <span style={{ width: 56 }} />
      </div>

      <div className="picker-map">
        <MapContainer
          ref={setMap}
          center={[start.lat, start.lng]}
          zoom={initial ? 16 : 12}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} subdomains="abcd" maxZoom={20} />
          <MapEvents onMove={(c) => setCenter({ lat: c.lat, lng: c.lng })} />
        </MapContainer>
        <div className="center-pin">📍</div>
        <button className="locate-btn" onClick={myLocation}>{t("my_location")}</button>
      </div>

      <div className="picker-bottom">
        <span className="field-label">{t("address_hint")}</span>
        <input
          className="input"
          value={geocoding ? "…" : address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Button onClick={pick} disabled={geocoding}>{t("pick_here")}</Button>
      </div>
    </div>
  );
}
