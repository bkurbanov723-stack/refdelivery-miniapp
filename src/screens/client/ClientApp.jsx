import { useState } from "react";
import { useLang, useT } from "../../i18n";
import { Tabs } from "../../ui";
import Profile from "../Profile";
import MyOrders from "./MyOrders";
import NewOrder from "./NewOrder";
import OrderDetail from "./OrderDetail";

export default function ClientApp({ me, refs, switchMode, onAdmin }) {
  const t = useT();
  const { lang } = useLang();
  const [tab, setTab] = useState("new");
  const [openId, setOpenId] = useState(null);

  let content;
  if (tab === "orders" && openId) content = <OrderDetail id={openId} onBack={() => setOpenId(null)} />;
  else if (tab === "orders") content = <MyOrders onOpen={setOpenId} />;
  else if (tab === "profile") content = <Profile me={me} mode="client" switchMode={switchMode} onAdmin={onAdmin} />;
  else content = <NewOrder refs={refs} onCreated={(id) => { setOpenId(id); setTab("orders"); }} />;

  return (
    <>
      <main className="content">{content}</main>
      <Tabs
        value={tab}
        onChange={(v) => { setTab(v); setOpenId(null); }}
        tabs={[
          { id: "new", icon: "➕", label: t("tab_new") },
          { id: "orders", icon: "📦", label: lang === "ru" ? "Мои заказы" : "Buyurtmalarim" },
          { id: "profile", icon: "👤", label: t("tab_profile") },
        ]}
      />
    </>
  );
}
