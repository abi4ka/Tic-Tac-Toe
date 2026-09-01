# Tic-Tac-Toe

A minimalist, responsive web application for playing Tic-Tac-Toe locally on a single device or online across two separate computers via serverless Peer-to-Peer (WebRTC) networking.

## Features

- **Dual Game Modes**: Supports both Local 2-Player (Pass & Play on one screen) and Online P2P Multiplayer (across two separate devices).
- **Serverless Online Multiplayer**: Connects players directly using WebRTC via PeerJS. No backend server or database is required.
- **Direct Link Sharing**: Room creation generates a 6-character room code and a direct join URL (`?room=CODE`).
- **Minimalist Interface**: Clean, icon-driven user interface with zero clutter and inline match status updates.
- **Pure Static Architecture**: Runs completely in the browser, making it ideal for hosting on static services like GitHub Pages.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox, Responsive Grid)
- **Programming Language**: JavaScript (ES6+)
- **Networking**: PeerJS (WebRTC DataChannel API)
- **Audio**: Web Audio API (synthesized move and match sounds)

## Local Development

Since this project consists of standard static assets, no compilation or build steps are required.

To run locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Tic-Tac-Toe.git
   cd Tic-Tac-Toe
   ```

2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in your web browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
