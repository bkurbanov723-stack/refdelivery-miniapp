// Server manzili (Supabase "api" funksiyasi).
// forceFunctionRegion — server baza turgan mintaqada (Mumbay) ishlaydi, shuning uchun tezroq javob beradi.
export const API_URL =
  "https://wxsspdzitxczhtnwrghr.supabase.co/functions/v1/api?forceFunctionRegion=ap-south-1";

// Xarita boshlanadigan joy — Toshkent markazi
export const TASHKENT = { lat: 41.2995, lng: 69.2401 };

// Tez ishlaydigan xarita plitkalari (CARTO, OpenStreetMap ma'lumotlari asosida)
export const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const TILE_ATTRIBUTION = "© OpenStreetMap © CARTO";

// Bitta buyurtmada eng ko'p qo'shimcha nuqta
export const MAX_STOPS = 5;
