This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Server review configuration

Keep `.env` out of Git and Docker build context. Docker Compose reads the local
`.env` and passes `NEXT_PUBLIC_CESIUM_TOKEN`, `NEXT_PUBLIC_MAPY_API_KEY`, and
`NEXT_PUBLIC_OPENAIP_API_KEY` as explicit build arguments. These `NEXT_PUBLIC_`
values are visible in the browser bundle: use only appropriately restricted
client credentials. Rebuild when changing them. Without a Cesium token, preview
uses OSM imagery and an ellipsoid globe; terrain and buildings are optional.

Download zones with `node scripts/fetch-airspaces.js cz` (or `rs`) and
`node scripts/fetch-protected-areas.js cz` (or `rs`).
`node scripts/fetch-small-reserves.js cz` supports Czech categories only.
Downloads go to `public/data/`; inspect counts and all query results before
publishing. OSM downloads are approximate: existing stitching can drop boundary
segments and bbox queries include neighbouring countries.
