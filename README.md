# Johan's Field Notes

A personal Astro site deployed to Cloudflare Workers from the `main` branch.

## Sensor stream

The home page includes a generic, accessible sensor ticker. Without
`PUBLIC_SENSOR_FEED_URL` it shows explicitly labelled, fixed demo readings.
With a feed URL it polls once per minute, displays measurement age and stale/offline
states, and never substitutes demo values on failure. Motion can be paused and
respects reduced-motion preferences. On mobile the panel follows the main content.

See [the Swedish TTN setup guide](docs/ttn-setup.md) for the optional, separate
Cloudflare Worker and D1 database in `sensor-bridge/`. The site's existing Worker
configuration is unchanged. No cloud resources are provisioned by this commit.

Demo and live readings share `src/lib/sensor-presentation.ts`: local SVG icons,
separate values/units, and readable labels and metadata. Common English/Swedish
measurement labels select an icon automatically; unknown types use a generic
sensor icon. To override a custom label, add its public reading ID and icon kind
to `src/data/sensor-kinds.ts`, for example
`'NODE 01:supply_voltage': 'battery'`. Available kinds: `temperature`, `battery`,
`humidity`, `level`, `pressure`, `light`, `sensor`. Voltage or percent alone does
not imply battery or humidity. No changes to TTN, the bridge or its database are
required. Rebuild the site after changing an override.

Run `npm test` and `npm run build` before merging. Test normalizers, webhook auth,
data privacy, and replay/out-of-order handling before connecting real devices.

## Edit your profile

The terminal-inspired theme uses neutral black surfaces, muted green and amber,
IBM Plex Sans for prose, and Courier New (with Courier/Liberation Mono fallbacks)
for navigation, metadata and sensor values. Theme tokens live in
`src/styles/global.css`.

The portrait's paper border, slight tilt and shadow are CSS. The decorative metal
clip is `public/images/paperclip.svg`. Replacing the profile photo retains the
card treatment; no edits to the original portrait are needed. The clip is hidden
from assistive technology and scales down with the card on mobile.

Profile text, links and current-focus topics live in:

```text
src/data/site.ts
```

To add a profile photo, place a square image in `public/images/`, for example:

```text
public/images/profile.webp
```

Then change `profileImage` in `src/data/site.ts` to:

```ts
profileImage: '/images/profile.webp',
```

A square WebP or JPEG around 1200 × 1200 pixels and below 1 MB works well.

## Add a field note

Create a Markdown file in `src/content/notes/`. Use an existing file as a starting point. Each file automatically receives its own `/notes/.../` URL and appears on the home page.

Images used by notes belong in `public/images/` and are referenced as `/images/filename.ext`.

## Local development

```sh
npm install
npm run dev
```

Open `http://localhost:4321`. Before publishing, run:

```sh
npm run build
```

Push changes through a branch and pull request. Merging to `main` triggers the Cloudflare deployment.

## Project structure

```text
public/images/             Static images
src/components/            Reusable UI components
src/content/notes/         Blog posts in Markdown
src/data/site.ts           Profile and current-focus content
src/layouts/               Page shells
src/pages/                 Routes
src/styles/global.css      Visual system and responsive layout
```
