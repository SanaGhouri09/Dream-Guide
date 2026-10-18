# Dawa Check

Static website that shows DRAP's official medicine prices (21,534 packs) and DRAP drug alerts (756 entries), in Roman Urdu and English. No backend, no build step.

## Files

| Path | What it is |
|---|---|
| `index.html` | The tool: price check, batch check, latest alerts, FAQ, disclaimer |
| `feedback.html` | Feedback page: rating, feature picks, message |
| `privacy.html`, `terms.html`, `cookies.html`, `how-we-verify.html`, `404.html` | Policy and method pages |
| `assets/site.js` | Settings (`SITE`), footer, cookie consent, Google Analytics loader, back-to-top |
| `assets/site.css` | Shared colors, header, footer, cookie UI, policy page styles |
| `data/prices.js`, `data/alerts.js` | The DRAP data |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installable app + offline copy |
| `_headers` | Security headers for Cloudflare Pages / Netlify |

## Before going live

1. Set `SITE.gaId` in `assets/site.js` to your GA4 measurement ID (blank = analytics off). In GA, set data retention to 14 months to match the privacy page.
2. Set `SITE.x` / `SITE.email` for the contact card.
3. Set `SITE.formEmail` to the inbox for the "missing medicine" form and the feedback page. Forms post to formsubmit.co; the first submission sends an activation email to that inbox, and nothing arrives until you click it. To use Formspree or Web3Forms instead, set `SITE.formEndpoint`. Until one is set, both forms show a copy-this-text fallback.
4. Replace `YOUR-DOMAIN` in `robots.txt` and `sitemap.xml`.
5. When the data changes: replace `data/*.js`, run `node scripts/clean-prices.js` (keeps the newest price per pack, drops Rs 0 rows), update `META.updated` in `index.html` and `SITE.updated` in `assets/site.js`, and bump `VERSION` in `sw.js`.

## Run locally

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Analytics events

`price_search`, `price_compare` (medicine, pack, overcharged, over_by), `batch_check` (result, medicine), `call_helpline`, `whatsapp_share`, `complaint_copy`, `open_drap_alert`, `open_drap_report`, `lang_switch`, `missing_medicine_submit`, `feedback_rating`, `feedback_submit`, `scene_toggle`. Mark `price_compare` and `batch_check` as key events in GA4.
