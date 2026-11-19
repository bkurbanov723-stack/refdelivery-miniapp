import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

// Kichik xarita: yashil — olish joyi, qizil — yetkazish joyi, ko'k — haydovchi
export default function OrderMap({ order, height = 200 }) {
  const points = [
    [order.from_lat, order.from_lng],
    [order.to_lat, order.to_lng],
  ];
  const driver = order.driver?.lat != null ? [order.driver.lat, order.driver.lng] : null;
  if (driver) points.push(driver);

  return (
    <div className="order-map" style={{ height }}>
      <MapContainer
        bounds={points}
        boundsOptions={{ padding: [30, 30] }}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <CircleMarker center={points[0]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#22a06b", fillOpacity: 1 }} />
        <CircleMarker center={points[1]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#e5484d", fillOpacity: 1 }} />
        {driver && (
          <CircleMarker center={driver} radius={10} pathOptions={{ color: "#fff", weight: 3, fillColor: "#0ea5e9", fillOpacity: 1 }} />
        )}
      </MapContainer>
    </div>
  );
}
