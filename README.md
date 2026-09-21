# Tic-Tac-Toe

A minimalist, responsive web application for playing Tic-Tac-Toe locally on a single device or online across different computers and mobile devices via Supabase Realtime (WebSockets).

## Features

- **Dual Game Modes**: Supports both Local 2-Player (Pass & Play on one screen) and Online Multiplayer (across separate devices and networks).
- **Cross-Network Realtime Multiplayer**: Connects players reliably across any network (mobile 4G/5G, Wi-Fi, different ISPs) via Supabase Realtime (WebSockets on secure port 443). No custom backend server or database setup required.
- **Direct Link Sharing**: Room creation generates a 6-character room code and a direct join URL (`?room=CODE`).
- **Minimalist Interface**: Clean, icon-driven user interface with zero clutter, inline match status updates, and interactive emoji reactions.
- **Pure Static Architecture**: Runs completely in the browser, making it ideal for hosting on static platforms like GitHub Pages.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox, Responsive Grid)
- **Programming Language**: JavaScript (ES6+)
- **Networking**: Supabase Realtime (WebSockets via Broadcast & Presence channels)
- **Audio**: Web Audio API (synthesized move and match sounds)

## Configuration

The online multiplayer functionality is powered by Supabase Realtime. Configuration is stored in `config.js`:

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY'
};
```

> **Note**: Supabase Realtime Broadcast and Presence run purely in-memory over WebSockets — no database tables or SQL migrations are required.

## Local Development

Since this project consists of standard static assets, no compilation or build steps are required.

To run locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/abi4ka/Tic-Tac-Toe.git
   cd Tic-Tac-Toe
   ```

2. Start a local HTTP server:
   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in your web browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
