# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Durable Findra design decisions

- Support both light and dark appearance modes throughout the public site and dashboards, and persist the visitor's selection locally.
- In dark mode, use the client-provided `public/assets/findra-logo-dark-provided.png` logo asset.
- Use clearly differentiated, high-contrast backgrounds for multi-step progress bars in both light and dark modes.
- On desktop, listing creation and editing use a form-left, live-preview-right workspace; on mobile, provide an explicit Edit details / Live preview toggle.
- Payment credentials are configured from the admin Integrations workspace, remain server-side, and are never returned unmasked to the browser.
- Admin-managed categories and services populate the business listing editor, while existing listings retain their saved taxonomy values.
- Admin notification workflows use Findra's current visual system while supporting WordPress/Listivo-style automation rules, editable system messages, delivery logs, and sender settings.
- Admin-created custom fields must be persistent, ordered, visibility-aware, and render as real saved inputs in the appropriate multi-step listing form and public listing detail.
- Dashboard body and control text should generally remain at 12px or larger, with metadata no smaller than 9.5–10px and strong 20–31px page/section headings.
