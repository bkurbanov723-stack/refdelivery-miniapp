import { useEffect, useState } from "react";
import { api } from "../../api";
import { useT } from "../../i18n";
import { Tabs } from "../../ui";
import Profile from "../Profile";
import AvailableOrders from "./AvailableOrders";
import DriverRegister from "./DriverRegister";
import MyTrips from "./MyTrips";

// Haydovchi onlayn bo'lsa, joylashuvini har daqiqada serverga yuborib turamiz
function useLocationSender(active) {
  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    let last = 0;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        if (now - last < 60000) return;
        last = now;
        api("driver_location", { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);
}

export default function DriverApp({ me, reload, switchMode }) {
  const t = useT();
  const approved = me.driver?.status === "approved";
  const [tab, setTab] = useState(approved ? "orders" : "register");
  useLocationSender(approved && !!me.driver?.is_online);

  useEffect(() => {
    if (!approved && (tab === "orders" || tab === "trips")) setTab("register");
  }, [approved, tab]);

  let content;
  if (tab === "profile") content = <Profile me={me} mode="driver" switchMode={switchMode} />;
  else if (tab === "register" || !approved) content = <DriverRegister me={me} reload={reload} />;
  else if (tab === "trips") content = <MyTrips />;
  else content = <AvailableOrders me={me} reload={reload} onAccepted={() => setTab("trips")} />;

  const tabs = approved
    ? [
        { id: "orders", icon: "📋", label: t("tab_orders") },
        { id: "trips", icon: "🚚", label: t("tab_trips") },
        { id: "register", icon: "🚛", label: t("my_vehicle") },
        { id: "profile", icon: "👤", label: t("tab_profile") },
      ]
    : [
        { id: "register", icon: "📝", label: t("tab_register") },
        { id: "profile", icon: "👤", label: t("tab_profile") },
      ];

  return (
    <>
      <main className="content">{content}</main>
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
    </>
  );
}
