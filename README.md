# Telegram Web – MTProto PWA

A full-featured Telegram Web client built with **Next.js 15**, **TailwindCSS**, **Zustand**, and a custom **MTProto** core layer.

## Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS (dark Telegram palette) |
| State | Zustand v5 |
| PWA | next-pwa |
| Storage | IndexedDB (idb) |
| Protocol | MTProto WebSocket |

## Quick Start

```bash
npm install
# 1. Register at https://my.telegram.org/apps and get API_ID + API_HASH
# 2. cp .env.local.example .env.local  and fill in values
npm run dev
```

## Project Structure
```
src/
├── core/telegram/     # MTProto client, connection, auth, updates, TL codec
├── core/storage/      # IndexedDB + LRU cache
├── services/          # Auth, Dialogs, Messages, Media, Stickers, … (13 services)
├── store/             # Zustand stores (auth, dialogs, messages)
├── components/ui/     # Avatar, Badge, Button, Input, BottomSheet, SearchBar …
├── features/
│   ├── authentication/   # Phone → Code → 2FA password flow
│   ├── chat-list/        # Stories row + dialog list with tabs
│   ├── conversations/    # Message bubbles, reply, voice input
│   ├── contacts/         # Contact list + search
│   ├── profile/          # User profile hero
│   ├── media/            # Full-screen media viewer
│   └── settings/         # Settings menu + logout
└── app/               # Next.js App Router pages
```

## PWA
- Installable on iOS / Android
- Offline shell via service worker
- Safe-area insets for notch devices
- Portrait-locked, no zoom

## Notes
- The MTProto core in `src/core/telegram/` is a **skeleton** – replace `TLSerializer / TLDeserializer` and `createAuthKey()` with a full implementation (e.g. [@mtproto/core](https://github.com/alik0211/mtproto-core)) for production use.
- All mock data is in `src/features/*/mock*.ts` – wire up real service calls to remove it.
