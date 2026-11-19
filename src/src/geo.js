// Manzil qidirish va nuqtadan manzil olish.
// Photon (OpenStreetMap asosida) — tez ishlaydi va yozish davomida takliflar beradi.
import { TASHKENT } from "./config";

const PHOTON = "https://photon.komoot.io";
const UZ_BBOX = "55.9,37.1,73.2,45.6"; // O'zbekiston chegarasi

function label(p) {
  const street = p.street ? p.street + (p.housenumber ? " " + p.housenumber : "") : null;
  const parts = [];
  const dup = p.name && street && (street.includes(p.name) || (p.street && p.name.includes(p.street)));
  if (p.name && !dup) parts.push(p.name);
  if (street) parts.push(street);
  else if (p.housenumber && p.name) parts[0] = `${p.name} ${p.housenumber}`;
  const area = p.district || p.locality || p.city || p.county || p.state;
  if (area && !parts.includes(area)) parts.push(area);
  return parts.join(", ");
}

function sub(p) {
  return [p.city || p.county, p.state].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(", ");
}

export async function searchPlaces(query, near, signal) {
  const c = near || TASHKENT;
  const url = `${PHOTON}/api/?q=${encodeURIComponent(query)}&limit=8&lat=${c.lat}&lon=${c.lng}&bbox=${UZ_BBOX}`;
  const r = await fetch(url, { signal });
  const j = await r.json();
  return (j.features || [])
    .map((f) => ({
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      address: label(f.properties),
      hint: sub(f.properties),
    }))
    .filter((x) => x.address);
}

export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&limit=1`);
    const j = await r.json();
    const f = j.features?.[0];
    const a = f ? label(f.properties) : "";
    return a || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// Oxirgi tanlangan manzillar (telefonda saqlanadi)
const RECENT_KEY = "rd_recent_places";

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRecent(p) {
  try {
    const list = getRecent().filter((x) => x.address !== p.address);
    list.unshift({ lat: p.lat, lng: p.lng, address: p.address });
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* saqlab bo'lmasa ham ishlayveradi */
  }
}
