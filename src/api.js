import { API_URL } from "./config";
import { tg } from "./tg";

export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Serverga so'rov: api("create_order", {...})
export async function api(action, params = {}) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Init-Data": tg?.initData || "" },
      body: JSON.stringify({ action, ...params }),
    });
  } catch {
    throw new ApiError("NETWORK");
  }
  const json = await res.json().catch(() => ({ ok: false, error: "SERVER_ERROR" }));
  if (!json.ok) throw new ApiError(json.error || "SERVER_ERROR");
  return json.data;
}
