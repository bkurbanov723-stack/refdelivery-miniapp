import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { TILE_ATTRIBUTION, TILE_URL } from "../config";

const dot = (fill) => ({ color: "#fff", weight: 3, fillColor: fill, fillOpacity: 1 });

// Kichik xarita: yashil — olish joyi, sariq — qo'shimcha nuqtalar, qizil — oxirgi manzil, ko'k — haydovchi
export default function OrderMap({ order, height = 200 }) {
  const stops = (order.stops || []).map((s) => [s.lat, s.lng]);
  const from = [order.from_lat, order.from_lng];
  const to = [order.to_lat, order.to_lng];
  const driver = order.driver?.lat != null ? [order.driver.lat, order.driver.lng] : null;
  const points = [from, ...stops, to, ...(driver ? [driver] : [])];

  return (
    <div className="order-map" style={{ height }}>
      <MapContainer
        bounds={points}
        boundsOptions={{ padding: [30, 30] }}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={20} />
        <CircleMarker center={from} radius={9} pathOptions={dot("#22a06b")} />
        {stops.map((s, i) => <CircleMarker key={i} center={s} radius={8} pathOptions={dot("#e8a317")} />)}
        <CircleMarker center={to} radius={9} pathOptions={dot("#e5484d")} />
        {driver && <CircleMarker center={driver} radius={10} pathOptions={dot("#0ea5e9")} />}
      </MapContainer>
    </div>
  );
}
