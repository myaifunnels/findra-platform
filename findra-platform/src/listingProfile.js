export const PROFILE_LIMITS = {
  about: 200,
  services: 3,
  serviceChars: 25,
  gallery: 6,
  caption: 30,
  attachments: 1,
};

/** Normalize PH mobile numbers for WhatsApp, Viber, and tel links. */
export function messagingDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^0\d{10}$/.test(digits)) return `63${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `63${digits}`;
  return digits;
}

export function whatsappHref(value) {
  const digits = messagingDigits(value);
  return digits ? `https://wa.me/${digits}` : "";
}

export function viberHref(value) {
  const digits = messagingDigits(value);
  return digits ? `viber://chat?number=${encodeURIComponent(`+${digits}`)}` : "";
}

export function telHref(value) {
  const digits = messagingDigits(value);
  return digits ? `tel:+${digits}` : "";
}

export function categoryLine(item) {
  const category = String(item?.category || "").trim();
  const subs = [...(item?.subCategories || []), ...(item?.additionalCategories || [])]
    .map((value) => String(value || "").trim())
    .filter((value, index, list) => value && value !== category && list.indexOf(value) === index);
  if (!category) return "";
  return subs.length ? `${category} / ${subs.join(", ")}` : category;
}

export function clipAbout(text) {
  return String(text || "").trim().slice(0, PROFILE_LIMITS.about);
}

export function clipServices(services) {
  return (services || [])
    .map((service) => String(service || "").trim().slice(0, PROFILE_LIMITS.serviceChars))
    .filter(Boolean)
    .filter((service, index, list) => list.indexOf(service) === index)
    .slice(0, PROFILE_LIMITS.services);
}

export function clipGallery(images) {
  return (images || []).slice(0, PROFILE_LIMITS.gallery);
}

export function clipCaptions(captions, count = PROFILE_LIMITS.gallery) {
  return (captions || [])
    .slice(0, count)
    .map((caption) => String(caption || "").slice(0, PROFILE_LIMITS.caption));
}

export function clipAttachments(files) {
  return (files || []).slice(0, PROFILE_LIMITS.attachments);
}

export function sanitizeListingRecord(record) {
  const next = { ...(record || {}) };
  if (next.description != null) next.description = clipAbout(next.description);
  if (next.services) next.services = clipServices(next.services);
  if (Array.isArray(next.additionalServices)) {
    next.additionalServices = clipServices([next.service, ...next.additionalServices]).slice(1);
  }
  if (next.galleryImages) {
    next.galleryImages = clipGallery(next.galleryImages);
    next.galleryCaptions = clipCaptions(next.galleryCaptions, next.galleryImages.length);
  }
  if (next.attachments) next.attachments = clipAttachments(next.attachments);
  return next;
}
