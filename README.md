# Retro Board

A lightweight, real-time sprint retrospective tool for engineering teams. No accounts, no login — just create a board, share the link, and collaborate live.

## Features

### Board
- **4-column Agile retro format** — Went Well, Went Poorly, Ideas, Action Items
- **Anonymous identity** — each participant gets a random fun name (e.g. "Vivid Coral") that lives for the tab session only, preserving anonymity
- **Real-time sync** — cards, reactions, and timer state sync instantly across all connected clients via Pusher WebSockets
- **Responsive layout** — 4-column desktop, 2×2 tablet, single-column mobile

### Cards
- Add cards with Enter or the ✓ button
- Edit in-place by clicking card content (author only)
- Delete on hover (author only)
- Mark as **discussed** via the ✓ button in the bottom-right corner — card gets a green tint and muted text; click again to unmark
- Discussed state syncs to all participants in real time
- Author name and relative timestamp on each card

### Reactions
- Four emoji reactions per card: 👍 ❤️ 🔥 💡
- Counts update live for all participants
- Your own reactions are highlighted

### Presence
- Live avatar circles in the header show who else is on the board
- Toast notification when someone joins or leaves

### Timer
- Anyone can start a shared countdown (any number of minutes)
- All participants see the same synchronized countdown
- Shifts amber under 2 minutes, soft red under 30 seconds
- On expiry: a calming glow overlay fades in and out over 5 seconds, then auto-dismisses

### Previous Session Action Items
- Paste a previous board's ID when creating a new board to carry forward unresolved action items
- Items are grouped by source session with the board title as a label
- Check items off as resolved — updates sync in real time
- Chain walks back multiple sessions: only unresolved items carry past the most recent board

### Menu (☰)
- **Copy ID** — copies the board ID for use in the next session's "continue from" field
- **Share link** — copies the full board URL to share with the team
- **New Retro** — navigates to the home page with the current board ID pre-filled so action items carry forward automatically

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Turso (LibSQL / SQLite) via Prisma 5 |
| Real-time | Pusher (WebSockets as a service) |
| Styling | Tailwind CSS v4 + inline styles |
| Animations | Framer Motion |
| UI Primitives | Radix UI (Collapsible) |
| Deployment | Vercel (fully serverless) |

---

## Running Locally

### Prerequisites
- Node.js 20+
- A [Turso](https://turso.tech) account and database
- A [Pusher](https://pusher.com) Channels app

### 1. Clone and install

```bash
git clone https://github.com/ts-eva/retro-board.git
cd retro-board
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
# Turso
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Pusher (server-side)
PUSHER_APP_ID=your-app-id
PUSHER_KEY=your-key
PUSHER_SECRET=your-secret
PUSHER_CLUSTER=your-cluster

# Pusher (client-side)
NEXT_PUBLIC_PUSHER_KEY=your-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-cluster
```

### 3. Apply the database schema

Push the schema to Turso via the HTTP API (the `prisma db push` command doesn't support libsql URLs directly):

```bash
curl -s "https://your-db-name.turso.io/v2/pipeline" \
  -H "Authorization: Bearer your-turso-auth-token" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      { "type": "execute", "stmt": { "sql": "CREATE TABLE IF NOT EXISTS Board (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '\''Sprint Retro'\'', createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, previousBoard TEXT)" } },
      { "type": "execute", "stmt": { "sql": "CREATE TABLE IF NOT EXISTS Card (id TEXT PRIMARY KEY, boardId TEXT NOT NULL, column TEXT NOT NULL, content TEXT NOT NULL, author TEXT NOT NULL, resolved BOOLEAN NOT NULL DEFAULT 0, discussed BOOLEAN NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (boardId) REFERENCES Board(id))" } },
      { "type": "execute", "stmt": { "sql": "CREATE TABLE IF NOT EXISTS Reaction (id TEXT PRIMARY KEY, cardId TEXT NOT NULL, emoji TEXT NOT NULL, author TEXT NOT NULL, UNIQUE(cardId, emoji, author), FOREIGN KEY (cardId) REFERENCES Card(id) ON DELETE CASCADE)" } },
      { "type": "execute", "stmt": { "sql": "CREATE TABLE IF NOT EXISTS CardLink (id TEXT PRIMARY KEY, fromId TEXT NOT NULL, toId TEXT NOT NULL, FOREIGN KEY (fromId) REFERENCES Card(id) ON DELETE CASCADE, FOREIGN KEY (toId) REFERENCES Card(id) ON DELETE CASCADE)" } },
      { "type": "close" }
    ]
  }'
```

### 4. Generate Prisma client and start

```bash
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** After any schema change, always run `npx prisma generate` and restart the dev server before testing. The running server caches the old Prisma client and won't pick up new fields until restarted.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local` to the Vercel project settings
4. Vercel uses `vercel.json` to run `npx prisma generate && next build` automatically

No custom server needed — all API routes run as serverless functions.
