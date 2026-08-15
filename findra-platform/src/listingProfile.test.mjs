import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryLine,
  clipAbout,
  clipAttachments,
  clipGallery,
  clipServices,
  messagingDigits,
  sanitizeListingRecord,
  telHref,
  viberHref,
  whatsappHref,
} from "./listingProfile.js";

test("PH 09 numbers become +63 for WhatsApp, Viber, and tel", () => {
  assert.equal(messagingDigits("0917 515 2402"), "639175152402");
  assert.equal(whatsappHref("0917 515 2402"), "https://wa.me/639175152402");
  assert.equal(viberHref("0917 515 2402"), "viber://chat?number=%2B639175152402");
  assert.equal(telHref("0917 515 2402"), "tel:+639175152402");
});

test("international +63 numbers stay correct", () => {
  assert.equal(whatsappHref("+639659718386"), "https://wa.me/639659718386");
  assert.equal(viberHref("+639659718386"), "viber://chat?number=%2B639659718386");
});

test("category line is Category / Sub-Category", () => {
  assert.equal(
    categoryLine({
      category: "Services & Rentals",
      subCategories: ["Event Coordination", "Venues & Rentals"],
    }),
    "Services & Rentals / Event Coordination, Venues & Rentals",
  );
  assert.equal(categoryLine({ category: "Services & Rentals", additionalCategories: [] }), "Services & Rentals");
});

test("public profile limits match the client brief", () => {
  const about = "x".repeat(250);
  assert.equal(clipAbout(about).length, 200);
  assert.deepEqual(
    clipServices(["Marketing Automation", "Coaching & Training", "Software Development", "Digital Marketing"]),
    ["Marketing Automation", "Coaching & Training", "Software Development"],
  );
  assert.equal(clipServices(["This service name is way too long"]).join("").length, 25);
  assert.equal(clipGallery(["a", "b", "c", "d", "e", "f", "g"]).length, 6);
  assert.equal(clipAttachments([{ name: "a.pdf" }, { name: "b.pdf" }]).length, 1);
});

test("sanitizeListingRecord applies the same caps on save", () => {
  const saved = sanitizeListingRecord({
    description: "y".repeat(300),
    services: ["one", "two", "three", "four"],
    galleryImages: [1, 2, 3, 4, 5, 6, 7],
    galleryCaptions: ["ok", "this caption is definitely longer than thirty chars"],
    attachments: [{ name: "a.pdf" }, { name: "b.pdf" }],
  });
  assert.equal(saved.description.length, 200);
  assert.equal(saved.services.length, 3);
  assert.equal(saved.galleryImages.length, 6);
  assert.equal(saved.galleryCaptions[1].length, 30);
  assert.equal(saved.attachments.length, 1);
});
