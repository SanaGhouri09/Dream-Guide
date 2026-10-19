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
2. `SITE.email` and `SITE.formEmail` are set to hello@dawacheck.pk. That address must exist (see Deploy, step 6) before the contact card and forms work.
3. `SITE.formEmail` is the inbox for the "missing medicine" form and the feedback page. Forms post to formsubmit.co; the first submission sends an activation email to that inbox, and nothing arrives until you click it. To use Formspree or Web3Forms instead, set `SITE.formEndpoint`. Until one is set, both forms show a copy-this-text fallback.
4. Domain: dawacheck.pk is already set in canonical links, social tags, `robots.txt` and `sitemap.xml`. Update `lastmod` in `sitemap.xml` when pages change.
5. When the data changes: replace `data/*.js`, run `node scripts/clean-prices.js` (keeps the newest price per pack, drops Rs 0 rows), update `META.updated` in `index.html` and `SITE.updated` in `assets/site.js`, and bump `VERSION` in `sw.js`.

## Run locally

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Analytics events

`price_search`, `price_compare` (medicine, pack, overcharged, over_by), `batch_check` (result, medicine), `call_helpline`, `whatsapp_share`, `complaint_copy`, `open_drap_alert`, `open_drap_report`, `lang_switch`, `missing_medicine_submit`, `feedback_rating`, `feedback_submit`, `scene_toggle`. Mark `price_compare` and `batch_check` as key events in GA4.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo.
2. Production branch: the branch with the site. Framework preset: None. Build command: empty. Build output directory: `dawa-check`.
3. Add the zone `dawacheck.pk` to Cloudflare (free plan). Cloudflare gives two nameservers.
4. In the PKNIC domain panel, replace the nameservers with Cloudflare's two. Changes can take a few hours.
5. Pages project → Custom domains → add `dawacheck.pk` and `www.dawacheck.pk`, then add a redirect rule from `www` to the bare domain.
6. Email: Cloudflare → Email → Email Routing → create `hello@dawacheck.pk` forwarding to your inbox. Put it in `SITE.formEmail` (and `SITE.email` if it should show in the footer), push, submit the form once and click FormSubmit's activation email.
7. Google Search Console → add the domain property, verify with the TXT record in Cloudflare DNS, submit `https://dawacheck.pk/sitemap.xml`.
