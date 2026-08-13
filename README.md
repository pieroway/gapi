# Garage Sale Finder

A garage sale mapping app with a PHP/MySQL backend served via Apache. The original Node.js/Express backend is retained in the repository but is not the active stack.

---

## Active Stack: PHP / Apache / MySQL

The primary backend is PHP running on Apache, deployed via Docker. See [`php/README.md`](php/README.md) for full setup and deployment instructions.

### Quick Start (Docker)

Run from the **project root**:

```bash
docker compose -f php/docker-compose.yml up --build
```

The app will be available at **http://localhost:8080**.

### Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Your Google Maps API key |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL credentials |
| `ADMIN_TOKEN` | Password for the admin panel |

When running via Docker, `GOOGLE_MAPS_API_KEY` and `ADMIN_TOKEN` are read from your `.env` file automatically via `docker-compose.yml`.

### Build (optional — for shared hosting deployment)

To produce a minified distributable in `dist-php/`:

```bash
bash php/build.sh
```

See `php/build.sh --help` for options including `--reset-db`.

---

## Features

- **Event Management** — Create, edit, soft-delete, and restore garage sale events
- **Map View** — Google Maps integration with marker clustering
- **Image Uploads** — Photo uploads per event
- **Ratings & Comments** — Visitor ratings and comments on events
- **Reports** — Flag inappropriate events
- **Admin Panel** — Protected admin interface at `/admin.html`
- **Rate Limiting** — Database-backed rate limiting on all write operations

---

## API Endpoints

### Events (`/api/events`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/events` | Get all active events |
| `POST` | `/api/events` | Create a new event |
| `GET` | `/api/events/:id` | Get a single event |
| `GET` | `/api/events/edit/:guid` | Get event for editing |
| `PUT` | `/api/events/edit/:guid` | Update an event |
| `DELETE` | `/api/events/edit/:guid` | Soft-delete an event |
| `POST` | `/api/events/edit/:guid/undelete` | Restore a soft-deleted event |
| `POST` | `/api/events/edit/:guid/photos` | Upload a photo |
| `POST` | `/api/events/:id/flag-ended` | Flag event as ended early |
| `POST` | `/api/events/:id/ratings` | Submit a rating |
| `POST` | `/api/events/:id/comments` | Add a comment |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/config` | Returns Google Maps API key |
| `GET` | `/api/sale_types` | List sale types |
| `GET` | `/api/item_categories` | List item categories |
| `GET` | `/api/reports` | List reports *(admin only)* |
| `POST` | `/api/reports` | Submit a report |
| `DELETE` | `/api/reports/:id` | Delete a report *(admin only)* |

---

## Project Structure

```
gapi/
├── php/                    ← Active PHP backend
│   ├── api/                ← PHP API endpoints
│   ├── .htaccess           ← Apache URL routing
│   ├── docker-compose.yml  ← Docker stack definition
│   ├── Dockerfile          ← PHP/Apache image
│   ├── docker-entrypoint.sh
│   ├── initializedb.sql    ← DB schema + seed data
│   ├── build.sh            ← Build script → dist-php/
│   └── README.md           ← PHP-specific docs
├── public/                 ← Shared frontend (HTML, CSS, JS)
├── routes/                 ← Node.js route handlers (retained)
├── data/                   ← Reference/seed data
├── migrations/             ← DB migration scripts
├── index.js                ← Node.js/Express server (retained)
├── db.js                   ← Node.js DB connection (retained)
├── admin.js                ← Node.js admin middleware (retained)
├── build.js                ← Node.js build script → dist/
├── package.json
└── .env.example
```

---

## Node.js Version (Retained)

The original Node.js/Express backend is still present and functional. It is not the active deployment target but is kept for reference.

To run the Node stack locally:

```bash
npm install
npm run dev     # development (nodemon)
npm start       # production
```

To build a Node distributable:

```bash
npm run build   # → dist/
```

The Node server runs on `http://localhost:61571` by default.

---

## PHP Version Requirement

PHP **7.4+** required; PHP 8.x recommended.
