# XeniOS Website

Official website for the XeniOS project.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4

## Development

```bash
cd /Users/admin/Documents/xenios-website
npm install
npm run dev
```

Open `http://localhost:3000`.

If a stale Next.js dev lock is left behind:

```bash
pkill -f "next dev"
rm -f .next/dev/lock
npm run dev
```

## Scripts

- `npm run dev` - start local development server
- `npm run build` - build production output
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Project Structure

- `src/app` - routes and page layouts
- `src/components` - shared UI components
- `src/lib` - constants and data logic
- `data/compatibility.json` - compatibility dataset

## Legal and Credits

- License inherits upstream Xenia project license.
- Legal, privacy, and credits pages are implemented at:
  - `/legal`
  - `/license`
  - `/privacy`
  - `/credits`
