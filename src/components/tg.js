// Telegram Mini App bilan ishlash uchun yordamchilar
export const tg = window.Telegram?.WebApp;

export function haptic(type = "light") {
  try {
    if (type === "success" || type === "error") tg?.HapticFeedback?.notificationOccurred(type);
    else tg?.HapticFeedback?.impactOccurred(type);
  } catch {
    /* e'tibor bermaymiz */
  }
}

export function askConfirm(text) {
  return new Promise((resolve) => {
    try {
      if (tg?.showConfirm) {
        tg.showConfirm(text, (ok) => resolve(!!ok));
        return;
      }
    } catch {
      /* pastdagi oddiy oynaga o'tamiz */
    }
    resolve(window.confirm(text));
  });
}

export function openLink(url) {
  try {
    if (tg?.openLink) return tg.openLink(url);
  } catch {
    /* oddiy usul */
  }
  window.open(url, "_blank");
}

export function toast(text) {
  window.dispatchEvent(new CustomEvent("rd-toast", { detail: text }));
}
