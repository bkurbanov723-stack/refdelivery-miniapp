// Server manzili (Supabase "api" funksiyasi).
// forceFunctionRegion — server baza turgan mintaqada (Mumbay) ishlaydi, shuning uchun tezroq javob beradi.
export const API_URL =
  "https://wxsspdzitxczhtnwrghr.supabase.co/functions/v1/api?forceFunctionRegion=ap-south-1";

// Xarita boshlanadigan joy — Toshkent markazi
export const TASHKENT = { lat: 41.2995, lng: 69.2401 };

// Xarita plitkalari (OpenStreetMap, kalit talab qilinmaydi)
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = "© OpenStreetMap";

// Bitta buyurtmada eng ko'p qo'shimcha nuqta
export const MAX_STOPS = 5;

// Bot manzili (haydovchi jonli joylashuvni shu botga ulashadi)
export const BOT_USERNAME = "ref_delivery_bot";
