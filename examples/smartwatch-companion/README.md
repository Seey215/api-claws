# Smartwatch Companion

A reusable Next.js example that adds a private training companion to an existing smartwatch app.
It demonstrates more than question answering: the Agent remembers a goal, receives approved
workout data, keeps conversation context, and runs a scheduled review that changes next week's
plan.

The smartwatch is product context. The app already syncs with the device. API Claws does not
connect to or control the hardware.

## Architecture

```text
Smartwatch <-> existing app sync
                    |
                    v
              Next.js server
                    |
                    v
         one shared Developer Space
          |                         |
          v                         v
  Ava's API Claws Agent     Liam's API Claws Agent
  - isolated Drive          - isolated Drive
  - Sessions                - Sessions
  - weekly review           - weekly review
```

This example deliberately uses **one Agent per app user**. That gives each user an independent
Drive and Agent identity. The app stores the `userId -> agentId` mapping. Sessions are individual
conversations below the user's Agent; a Session is not the user-isolation boundary in this
example.

## Run the preview

The preview mode needs no API key. It uses the same UI and deterministic local state, so you can
inspect or record the complete story first.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then use the actions in order:

1. **Set up private Agent** creates a user-specific Agent, Drive, first Session, and weekly task.
2. **Sync latest workout** represents your existing app writing approved data to Drive.
3. **Run weekly review** represents the scheduled Agent reading Drive and adapting the plan.
4. Switch between Ava and Liam to see that their Agent state remains separate.

Use **Reset demo** to repeat the recording flow. Preview state is stored in `.data/`, which is
ignored by Git.

## Run against API Claws

Copy the environment template and add a server-side API key plus an existing Developer Space ID:

```bash
cp .env.example .env.local
npm run dev
```

```dotenv
BUDA_API_KEY=sk_your_key
BUDA_SPACE_ID=your_developer_space_id
BUDA_API_BASE_URL=https://buda.im/api/v1
```

When both required values are present, the badge changes from **Preview data** to
**API Claws live**. The server then performs real API calls to:

- find or create one Agent for the selected app user;
- write the user's goal, activity, and approved feedback into that Agent's Drive;
- create and continue a Session;
- create a weekly scheduled task and run it on demand for the demo.

The `sk_` key is read only in server modules and never sent to the browser.

## Production notes

- Replace `.data/` with your database. Persist `userId -> agentId` and active `sessionId` mappings.
- Authenticate every route. Never trust a browser-provided user ID as this demo does.
- Decide which product events are safe to write to Drive and require user consent where needed.
- Keep device sync in your product. Send only the resulting approved data to API Claws.
- Scheduled reviews normally run in the cloud. The button triggers the task immediately only to
  make the behavior visible during a short demo.
- Add retries and background jobs around slow Agent runs before using this pattern in production.

## Key files

- `app/api/demo/route.ts` - server boundary and complete user flow
- `lib/api-claws.ts` - small API Claws client
- `lib/profiles.ts` - deterministic preview story
- `app/page.tsx` - product UI used for the demo
