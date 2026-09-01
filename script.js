/**
 * Tic Tac Toe - Minimalist English Logic (Vector SVG Icons)
 */

document.addEventListener('DOMContentLoaded', () => {
    const PEER_PREFIX = 'ttt-v1-';

    const SVG_X = `<svg class="cell-svg x-svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-x)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const SVG_O = `<svg class="cell-svg o-svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-o)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/></svg>`;

    const STATUS_SVG_X = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-x)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const STATUS_SVG_O = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-o)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/></svg>`;

    // Application Mode: 'local' or 'online'
    let currentMode = 'local';

    // Game Engine State
    let peer = null;
    let conn = null;
    let myRole = null; // 'host' (X) or 'joiner' (O)
    let mySymbol = 'X';
    let currentTurn = 'X';
    let boardState = Array(9).fill(null);
    let isGameActive = true;
    let roomCode = null;

    let scores = { X: 0, O: 0, draw: 0 };
    let rematchRequested = { me: false, opponent: false };

    const WINNING_COMBOS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // UI Elements - Screens
    const screenMenu = document.getElementById('screen-menu');
    const screenOnlineLobby = document.getElementById('screen-online-lobby');
    const screenWaiting = document.getElementById('screen-waiting');
    const screenGame = document.getElementById('screen-game');

    // UI Elements - Main Menu
    const btnSelectLocal = document.getElementById('btn-select-local');
    const btnSelectOnline = document.getElementById('btn-select-online');

    // UI Elements - Back Buttons
    const backBtns = document.querySelectorAll('.btn-to-menu');

    // UI Elements - Online Controls
    const btnCreateRoom = document.getElementById('btn-create-room');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const inputRoomCode = document.getElementById('input-room-code');
    const peerStatusBadge = document.getElementById('peer-status-badge');
    const peerStatusText = document.getElementById('peer-status-text');

    const displayRoomCode = document.getElementById('display-room-code');
    const btnCopyCode = document.getElementById('btn-copy-code');
    const btnCopyLink = document.getElementById('btn-copy-link');

    // UI Elements - Gameplay
    const modeTag = document.getElementById('mode-tag');
    const cells = document.querySelectorAll('.cell');
    const statusIcon = document.getElementById('status-icon');
    const statusText = document.getElementById('status-text');

    const boxX = document.getElementById('box-x');
    const boxO = document.getElementById('box-o');
    const scoreXElem = document.getElementById('score-x');
    const scoreOElem = document.getElementById('score-o');
    const scoreDrawElem = document.getElementById('score-draw');

    const reactionsBar = document.getElementById('reactions-bar');
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    const btnRestart = document.getElementById('btn-restart');
    const btnRestartText = document.getElementById('btn-restart-text');
    const btnShareOnline = document.getElementById('btn-share-online');

    // ==========================================
    // MENU NAVIGATION LOGIC
    // ==========================================

    btnSelectLocal.addEventListener('click', () => {
        currentMode = 'local';
        modeTag.textContent = 'LOCAL';
        reactionsBar.classList.add('hidden');
        btnShareOnline.classList.add('hidden');

        if (conn) { conn.close(); conn = null; }

        resetGameLocal();
        showScreen(screenGame);
    });

    btnSelectOnline.addEventListener('click', () => {
        currentMode = 'online';
        modeTag.textContent = 'ONLINE';
        reactionsBar.classList.remove('hidden');
        btnShareOnline.classList.remove('hidden');

        if (!peer) initPeer();

        if (conn && conn.open) {
            showScreen(screenGame);
        } else {
            showScreen(screenOnlineLobby);
        }
    });

    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (conn) { conn.close(); conn = null; }
            showScreen(screenMenu);
        });
    });

    // ==========================================
    // PEERJS NETWORK SETUP
    // ==========================================

    function initPeer() {
        peer = new Peer();

        peer.on('open', () => {
            peerStatusBadge.classList.add('connected');
            peerStatusText.textContent = 'Network Ready';
            checkUrlRoomParam();
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            peerStatusBadge.classList.remove('connected');
            if (err.type === 'peer-unavailable') {
                showToast('Room not found or expired.');
                showScreen(screenOnlineLobby);
            } else {
                showToast('Network error');
            }
        });

        peer.on('disconnected', () => {
            peerStatusBadge.classList.remove('connected');
            peerStatusText.textContent = 'Connecting...';
            peer.reconnect();
        });
    }

    function checkUrlRoomParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (room && room.length === 6) {
            currentMode = 'online';
            modeTag.textContent = 'ONLINE';
            inputRoomCode.value = room.toUpperCase();
            joinOnlineRoom(room.toUpperCase());
        }
    }

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let res = '';
        for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    }

    btnCreateRoom.addEventListener('click', () => {
        if (!peer || peer.disconnected) {
            showToast('Connecting to network...');
            return;
        }

        roomCode = generateCode();
        myRole = 'host';
        mySymbol = 'X';

        if (peer) peer.destroy();
        peer = new Peer(PEER_PREFIX + roomCode);

        peer.on('open', () => {
            displayRoomCode.textContent = roomCode;
            showScreen(screenWaiting);

            peer.on('connection', (connection) => {
                conn = connection;
                setupConnection();

                setTimeout(() => {
                    sendData({ type: 'INIT_GAME', scores: scores });
                    startOnlineGame();
                    showToast('Player 2 connected!');
                }, 400);
            });
        });

        peer.on('error', () => {
            showToast('Failed to create room.');
            initPeer();
            showScreen(screenOnlineLobby);
        });
    });

    btnJoinRoom.addEventListener('click', () => {
        const code = inputRoomCode.value.trim().toUpperCase();
        if (code.length !== 6) {
            showToast('Enter valid 6-character code');
            return;
        }
        joinOnlineRoom(code);
    });

    inputRoomCode.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') btnJoinRoom.click();
    });

    function joinOnlineRoom(code) {
        if (!peer || peer.disconnected) {
            showToast('Connecting...');
            return;
        }

        roomCode = code;
        myRole = 'joiner';
        mySymbol = 'O';

        conn = peer.connect(PEER_PREFIX + roomCode);
        setupConnection();
    }

    function setupConnection() {
        if (!conn) return;

        conn.on('open', () => {
            if (myRole === 'joiner') {
                startOnlineGame();
                showToast('Connected to room!');
            }
        });

        conn.on('data', (data) => handleData(data));
        conn.on('close', () => {
            showToast('Opponent disconnected');
            isGameActive = false;
            statusText.textContent = 'Opponent Left';
            statusIcon.innerHTML = '⚠️';
            btnRestart.classList.remove('hidden');
        });
    }

    function sendData(data) {
        if (conn && conn.open) conn.send(data);
    }

    function handleData(data) {
        switch (data.type) {
            case 'INIT_GAME':
                if (data.scores) scores = data.scores;
                updateScoresUI();
                break;
            case 'MOVE':
                applyMove(data.index, data.symbol);
                playSound('move');
                break;
            case 'REMATCH_REQUEST':
                rematchRequested.opponent = true;
                btnRestartText.textContent = 'Accept Rematch';
                btnRestart.classList.remove('hidden');
                showToast('Opponent requested a new game!');
                break;
            case 'REMATCH_ACCEPT':
                resetBoard();
                showToast('New game started!');
                break;
            case 'EMOJI':
                spawnEmoji(data.emoji);
                break;
        }
    }

    function startOnlineGame() {
        showScreen(screenGame);
        resetBoard();
        updateScoresUI();
    }

    // ==========================================
    // GAME ENGINE
    // ==========================================

    function resetGameLocal() {
        scores = { X: 0, O: 0, draw: 0 };
        resetBoard();
        updateScoresUI();
    }

    function resetBoard() {
        boardState = Array(9).fill(null);
        isGameActive = true;
        currentTurn = 'X';
        rematchRequested = { me: false, opponent: false };

        btnRestartText.textContent = 'New Game';
        btnRestart.classList.add('hidden');

        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'cell';
            cell.removeAttribute('disabled');
        });

        updateTurnUI();
    }

    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.getAttribute('data-index'));

            if (!isGameActive || boardState[index] !== null) return;

            if (currentMode === 'online' && currentTurn !== mySymbol) {
                showToast("Opponent's turn!");
                return;
            }

            applyMove(index, currentTurn);
            playSound('move');

            if (currentMode === 'online') {
                sendData({ type: 'MOVE', index, symbol: mySymbol });
            }
        });
    });

    function applyMove(index, symbol) {
        boardState[index] = symbol;
        const cell = cells[index];
        cell.innerHTML = symbol === 'X' ? SVG_X : SVG_O;
        cell.classList.add(symbol.toLowerCase());
        cell.setAttribute('disabled', 'true');

        const winCombo = checkWin(symbol);

        if (winCombo) {
            handleGameEnd(symbol, winCombo);
        } else if (boardState.every(c => c !== null)) {
            handleGameEnd('draw', null);
        } else {
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
            updateTurnUI();
        }
    }

    function updateTurnUI() {
        statusIcon.innerHTML = currentTurn === 'X' ? STATUS_SVG_X : STATUS_SVG_O;

        if (currentMode === 'online') {
            statusText.textContent = currentTurn === mySymbol ? 'Your Turn' : "Opponent's Turn";
        } else {
            statusText.textContent = 'Turn';
        }

        boxX.classList.toggle('turn-active', currentTurn === 'X');
        boxO.classList.toggle('turn-active', currentTurn === 'O');
    }

    function checkWin(symbol) {
        for (const combo of WINNING_COMBOS) {
            const [a, b, c] = combo;
            if (boardState[a] === symbol && boardState[b] === symbol && boardState[c] === symbol) {
                return combo;
            }
        }
        return null;
    }

    function handleGameEnd(winner, winCombo) {
        isGameActive = false;
        btnRestart.classList.remove('hidden');

        if (winner === 'draw') {
            scores.draw++;
            statusText.textContent = 'Draw!';
            statusIcon.innerHTML = '🤝';
            playSound('draw');
        } else {
            scores[winner]++;
            winCombo.forEach(i => cells[i].classList.add(`winner-${winner.toLowerCase()}`));

            if (currentMode === 'online') {
                statusText.textContent = winner === mySymbol ? 'You Win!' : 'Opponent Wins!';
                statusIcon.innerHTML = '🏆';
                playSound(winner === mySymbol ? 'win' : 'lose');
            } else {
                statusText.textContent = 'Winner';
                statusIcon.innerHTML = winner === 'X' ? STATUS_SVG_X : STATUS_SVG_O;
                playSound('win');
            }
        }

        updateScoresUI();
    }

    function updateScoresUI() {
        scoreXElem.textContent = scores.X;
        scoreOElem.textContent = scores.O;
        scoreDrawElem.textContent = scores.draw;
    }

    btnRestart.addEventListener('click', handleRestartRequest);

    function handleRestartRequest() {
        if (currentMode === 'local') {
            resetBoard();
        } else {
            if (rematchRequested.me) return;

            rematchRequested.me = true;
            btnRestartText.textContent = 'Waiting...';
            sendData({ type: 'REMATCH_REQUEST' });

            if (rematchRequested.opponent) {
                sendData({ type: 'REMATCH_ACCEPT' });
                resetBoard();
            } else {
                showToast('Rematch request sent!');
            }
        }
    }

    // ==========================================
    // REACTION EMOJIS (Online Mode)
    // ==========================================

    emojiBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const emoji = btn.getAttribute('data-emoji');
            spawnEmoji(emoji);
            if (currentMode === 'online') sendData({ type: 'EMOJI', emoji });
        });
    });

    function spawnEmoji(emoji) {
        const container = document.getElementById('reaction-container');
        const elem = document.createElement('div');
        elem.className = 'floating-emoji';
        elem.textContent = emoji;
        elem.style.left = `${Math.random() * 60 + 20}vw`;
        elem.style.bottom = '80px';

        container.appendChild(elem);
        setTimeout(() => elem.remove(), 2000);
    }

    // ==========================================
    // HELPERS & AUDIO (WITH TOAST MAX 3 QUEUE)
    // ==========================================

    btnCopyCode.addEventListener('click', () => copyText(roomCode, 'Room code copied!'));
    btnCopyLink.addEventListener('click', () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
        copyText(url, 'Direct link copied!');
    });
    btnShareOnline.addEventListener('click', () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
        copyText(url, 'Direct link copied!');
    });

    function copyText(str, msg) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(str).then(() => showToast(msg));
        } else {
            const el = document.createElement('textarea');
            el.value = str;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast(msg);
        }
    }

    function showToast(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Limit visible toasts to maximum 3; remove oldest if limit reached
        while (container.children.length >= 3) {
            container.firstElementChild.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode === container) {
                toast.remove();
            }
        }, 2200);
    }

    function showScreen(target) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        target.classList.add('active');
    }

    function playSound(type) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            if (type === 'move') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(750, now + 0.07);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.1);
                osc.frequency.setValueAtTime(783.99, now + 0.2);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            }
        } catch (e) {}
    }

    showScreen(screenMenu);
    checkUrlRoomParam();
});
