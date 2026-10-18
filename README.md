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

Run `npm test` and `npm run build` before merging. Test normalizers, webhook auth,
data privacy, and replay/out-of-order handling before connecting real devices.

## Edit your profile

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
