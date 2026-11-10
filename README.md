This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

1. Create the env files from the template:

   ```bash
   cp .env.example .env.local        # dev (host-side DATABASE_URL uses localhost)
   cp .env.example .env.production   # prod: change DATABASE_URL host to "db"
   ```

2. Start the dev stack (web app + PostgreSQL 17):

   ```bash
   docker compose -f docker-compose.dev.yml up
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. PostgreSQL is published on `localhost:5432` (user `postgres`, password `postgres`, database `fitness_tracker`).

To run the app without Docker, start PostgreSQL yourself, then run `npm run db:migrate` and `npm run dev`. The dev compose already runs `db:migrate` before the app starts.

To load dev sample data, run `npm run db:seed`. It wipes all tables first and then checks the relations.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
