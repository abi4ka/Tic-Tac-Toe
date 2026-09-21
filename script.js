/**
 * Tic Tac Toe - Minimalist English Logic (Random First Turn & Alternating Rematches)
 * Supabase Realtime (WebSockets) Multiplayer Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    const SVG_X = `<svg class="cell-svg x-svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-x)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const SVG_O = `<svg class="cell-svg o-svg" viewBox="0 0 24 24" fill="none" stroke="var(--color-o)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/></svg>`;

    const STATUS_SVG_X = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-x)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const STATUS_SVG_O = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-o)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/></svg>`;

    const ICON_RELOAD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`;
    const ICON_EXIT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;

    // Application Mode: 'local' or 'online'
    let currentMode = 'local';

    // Game Engine State
    let supabase = null;
    let gameChannel = null;
    let myRole = null; // 'host' (X) or 'joiner' (O)
    let mySymbol = 'X';
    let currentTurn = 'X';
    let startingSymbol = 'X';
    let hasActiveSession = false;
    let isOpponentConnected = false;
    let lastWinner = null;
    let lastWinCombo = null;

    let boardState = Array(9).fill(null);
    let isGameActive = true;
    let roomCode = null;
    let pendingJoinRoom = null;

    let scores = { X: 0, O: 0, draw: 0 };
    let rematchRequested = { me: false, opponent: false };
    let joinTimeout = null;

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
    const waitingTitle = document.getElementById('waiting-title');
    const waitingCodeBox = document.getElementById('waiting-code-box');

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
    const btnRestartIcon = document.getElementById('btn-restart-icon');
    const btnRestartText = document.getElementById('btn-restart-text');
    const btnShareOnline = document.getElementById('btn-share-online');

    const hostInviteBar = document.getElementById('host-invite-bar');
    const gameRoomCodeInput = document.getElementById('game-room-code-input');
    const btnTogglePeek = document.getElementById('btn-toggle-peek');
    const btnCopyGameCode = document.getElementById('btn-copy-game-code');
    const iconEyeClosed = document.getElementById('icon-eye-closed');
    const iconEyeOpen = document.getElementById('icon-eye-open');
    let isCodeRevealed = false;

    // ==========================================
    // MENU NAVIGATION LOGIC
    // ==========================================

    btnSelectLocal.addEventListener('click', async () => {
        currentMode = 'local';
        modeTag.textContent = 'LOCAL';
        reactionsBar.classList.add('hidden');
        if (hostInviteBar) hostInviteBar.classList.add('hidden');
        isCodeRevealed = false;

        await leaveSupabaseRoom();
        hasActiveSession = false;
        isOpponentConnected = false;
        lastWinner = null;
        lastWinCombo = null;

        updatePlayerIdentityUI();
        resetGameLocal();
        showScreen(screenGame);
    });

    btnSelectOnline.addEventListener('click', () => {
        currentMode = 'online';
        modeTag.textContent = 'ONLINE';
        reactionsBar.classList.remove('hidden');
        if (hostInviteBar) hostInviteBar.classList.add('hidden');
        isCodeRevealed = false;

        initSupabase();

        if (hasActiveSession && isOpponentConnected) {
            showScreen(screenGame);
        } else {
            showScreen(screenOnlineLobby);
        }
    });

    function clearJoinTimeout() {
        if (joinTimeout) {
            clearTimeout(joinTimeout);
            joinTimeout = null;
        }
    }

    function clearUrlRoomParam() {
        if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    async function leaveToMainMenu() {
        clearJoinTimeout();
        clearUrlRoomParam();
        await leaveSupabaseRoom();
        hasActiveSession = false;
        isOpponentConnected = false;
        lastWinner = null;
        lastWinCombo = null;
        isCodeRevealed = false;
        pendingJoinRoom = null;
        scores = { X: 0, O: 0, draw: 0 };
        updateScoresUI();
        if (hostInviteBar) hostInviteBar.classList.add('hidden');
        showScreen(screenMenu);
    }

    backBtns.forEach(btn => {
        btn.addEventListener('click', leaveToMainMenu);
    });

    // ==========================================
    // SUPABASE REALTIME NETWORK SETUP
    // ==========================================

    function initSupabase() {
        if (supabase) return true;

        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            if (peerStatusBadge) peerStatusBadge.classList.remove('connected');
            if (peerStatusText) peerStatusText.textContent = 'Connecting...';
            return false;
        }

        const config = window.SUPABASE_CONFIG;
        if (!config || !config.url || !config.anonKey || config.url.includes('YOUR_PROJECT_ID')) {
            if (peerStatusBadge) peerStatusBadge.classList.remove('connected');
            if (peerStatusText) peerStatusText.textContent = 'Config Needed';
            return false;
        }

        try {
            supabase = window.supabase.createClient(config.url, config.anonKey);
            if (peerStatusBadge) peerStatusBadge.classList.add('connected');
            if (peerStatusText) peerStatusText.textContent = 'Network Ready';
            return true;
        } catch (err) {
            console.error('Supabase init error:', err);
            if (peerStatusBadge) peerStatusBadge.classList.remove('connected');
            if (peerStatusText) peerStatusText.textContent = 'Network Error';
            return false;
        }
    }

    async function leaveSupabaseRoom() {
        clearJoinTimeout();
        if (gameChannel && supabase) {
            try {
                await gameChannel.untrack();
                await supabase.removeChannel(gameChannel);
            } catch (err) {
                console.warn('Error closing channel:', err);
            }
            gameChannel = null;
        }
    }

    async function setupSupabaseRoom(code) {
        await leaveSupabaseRoom();

        const channelName = `game-${code}`;
        gameChannel = supabase.channel(channelName, {
            config: {
                broadcast: { ack: false, self: false },
                presence: { key: myRole }
            }
        });

        // Broadcast message handler
        gameChannel.on('broadcast', { event: 'game-event' }, ({ payload }) => {
            handleData(payload);
        });

        // Presence state handler (Detects opponent join / leave)
        gameChannel
            .on('presence', { event: 'sync' }, () => {
                const state = gameChannel.presenceState();
                const opponentRole = myRole === 'host' ? 'joiner' : 'host';
                const hasOpponent = Boolean(state[opponentRole] && state[opponentRole].length > 0);

                if (hasOpponent && !isOpponentConnected) {
                    onOpponentConnected();
                }
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                const opponentRole = myRole === 'host' ? 'joiner' : 'host';
                if (key === opponentRole && !isOpponentConnected) {
                    onOpponentConnected();
                }
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                const opponentRole = myRole === 'host' ? 'joiner' : 'host';
                if (key === opponentRole) {
                    clearJoinTimeout();
                    isOpponentConnected = false;
                    showToast('Opponent disconnected');
                    statusText.textContent = 'Opponent Left';
                    statusIcon.innerHTML = '⚠️';
                    setRestartButtonState('exit', 'Back to Menu');
                    btnRestart.classList.remove('hidden');
                }
            });

        // Subscribe to channel
        gameChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await gameChannel.track({
                    role: myRole,
                    joinedAt: Date.now()
                });

                // If joiner, announce presence to host
                if (myRole === 'joiner') {
                    sendData({ type: 'JOINER_HELLO' });
                }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error('Channel subscription status:', status);
                showToast('Network error connecting to room.');
            }
        });
    }

    function onOpponentConnected() {
        clearJoinTimeout();
        isOpponentConnected = true;

        if (myRole === 'host') {
            if (!hasActiveSession) {
                hasActiveSession = true;
                startingSymbol = 'X';
                sendData({
                    type: 'INIT_GAME',
                    scores: scores,
                    startingSymbol: startingSymbol
                });
                startOnlineGame();
                showToast('Player 2 connected!');
            } else {
                sendData({
                    type: 'SYNC_GAME',
                    scores: scores,
                    startingSymbol: startingSymbol,
                    boardState: boardState,
                    currentTurn: currentTurn,
                    isGameActive: isGameActive,
                    lastWinner: lastWinner,
                    lastWinCombo: lastWinCombo
                });
                if (isGameActive) {
                    updateTurnUI();
                    btnRestart.classList.add('hidden');
                } else {
                    setRestartButtonState('restart', 'New Game');
                }
                showToast('Player 2 reconnected!');
            }
        }
    }

    function sendData(data) {
        if (gameChannel) {
            gameChannel.send({
                type: 'broadcast',
                event: 'game-event',
                payload: data
            }).catch(err => {
                console.error('Send error:', err);
            });
        }
    }

    function handleData(data) {
        if (!data || typeof data !== 'object') return;

        switch (data.type) {
            case 'JOINER_HELLO':
                if (myRole === 'host') {
                    onOpponentConnected();
                }
                break;
            case 'INIT_GAME':
                hasActiveSession = true;
                isOpponentConnected = true;
                clearJoinTimeout();
                if (data.scores) scores = data.scores;
                if (data.startingSymbol) startingSymbol = data.startingSymbol;
                startOnlineGame();
                showToast('Connected to room!');
                break;
            case 'SYNC_GAME':
                hasActiveSession = true;
                isOpponentConnected = true;
                clearJoinTimeout();
                if (data.scores) scores = data.scores;
                if (data.startingSymbol) startingSymbol = data.startingSymbol;
                boardState = data.boardState ? [...data.boardState] : Array(9).fill(null);
                currentTurn = data.currentTurn || 'X';
                isGameActive = data.isGameActive;
                lastWinner = data.lastWinner;
                lastWinCombo = data.lastWinCombo;

                showScreen(screenGame);
                updatePlayerIdentityUI();
                updateScoresUI();
                restoreBoardUI();

                if (isGameActive) {
                    updateTurnUI();
                } else if (lastWinner) {
                    renderGameEndUI(lastWinner, lastWinCombo);
                }
                showToast('Reconnected to game!');
                break;
            case 'MOVE':
                if (
                    isGameActive &&
                    Number.isInteger(data.index) &&
                    data.index >= 0 &&
                    data.index < 9 &&
                    boardState[data.index] === null &&
                    data.symbol === currentTurn
                ) {
                    applyMove(data.index, data.symbol);
                    playSound('move');
                }
                break;
            case 'REMATCH_REQUEST':
                rematchRequested.opponent = true;
                if (rematchRequested.me) {
                    if (myRole === 'host') {
                        prepareNextRoundTurn();
                        sendData({
                            type: 'REMATCH_ACCEPT',
                            startingSymbol: startingSymbol
                        });
                        resetBoard();
                    }
                } else {
                    setRestartButtonState('restart', 'Accept Rematch');
                    btnRestart.classList.remove('hidden');
                    showToast('Opponent requested a new game!');
                }
                break;
            case 'REMATCH_ACCEPT':
                if (data.startingSymbol) startingSymbol = data.startingSymbol;
                resetBoard();
                break;
            case 'EMOJI':
                if (typeof data.emoji === 'string' && data.emoji.length <= 4) {
                    spawnEmoji(data.emoji);
                }
                break;
        }
    }

    function checkUrlRoomParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (room && room.length === 6) {
            const code = room.toUpperCase();
            currentMode = 'online';
            modeTag.textContent = 'ONLINE';
            reactionsBar.classList.remove('hidden');
            inputRoomCode.value = code;
            joinOnlineRoom(code);
            return true;
        }
        return false;
    }

    function showConnectingScreen(code) {
        if (waitingTitle) waitingTitle.textContent = `Connecting to ${code}...`;
        if (waitingCodeBox) waitingCodeBox.classList.add('hidden');
        if (btnCopyLink) btnCopyLink.classList.add('hidden');
        showScreen(screenWaiting);
    }

    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let res = '';
        for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    }

    btnCreateRoom.addEventListener('click', async () => {
        if (!initSupabase()) {
            if (typeof window.supabase === 'undefined') {
                showToast('Connecting to network...');
                setTimeout(() => btnCreateRoom.click(), 300);
                return;
            }
            showToast('Please check config.js');
            return;
        }

        roomCode = generateCode();
        myRole = 'host';
        mySymbol = 'X';
        hasActiveSession = false;
        isOpponentConnected = false;
        lastWinner = null;
        lastWinCombo = null;
        isCodeRevealed = false;
        scores = { X: 0, O: 0, draw: 0 };
        updateScoresUI();
        updateCodePeekUI();

        displayRoomCode.textContent = roomCode;
        if (waitingTitle) waitingTitle.textContent = 'Waiting for Opponent...';
        if (waitingCodeBox) waitingCodeBox.classList.remove('hidden');
        if (btnCopyLink) btnCopyLink.classList.remove('hidden');
        showScreen(screenWaiting);

        await setupSupabaseRoom(roomCode);
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

    async function joinOnlineRoom(code) {
        if (!initSupabase()) {
            if (typeof window.supabase === 'undefined') {
                showConnectingScreen(code);
                setTimeout(() => joinOnlineRoom(code), 300);
                return;
            }
            showToast('Please check config.js');
            showScreen(screenOnlineLobby);
            return;
        }

        roomCode = code;
        myRole = 'joiner';
        mySymbol = 'O';
        scores = { X: 0, O: 0, draw: 0 };
        updateScoresUI();

        showConnectingScreen(code);

        clearJoinTimeout();
        joinTimeout = setTimeout(() => {
            if (myRole === 'joiner' && !isOpponentConnected) {
                showToast('Connection timed out. Room may not exist.');
                clearUrlRoomParam();
                leaveSupabaseRoom();
                showScreen(screenOnlineLobby);
            }
        }, 12000);

        await setupSupabaseRoom(code);
    }

    function setRestartButtonState(mode, text = null) {
        if (mode === 'exit') {
            if (btnRestartIcon) btnRestartIcon.innerHTML = ICON_EXIT;
            btnRestartText.textContent = text || 'Back to Menu';
        } else {
            if (btnRestartIcon) btnRestartIcon.innerHTML = ICON_RELOAD;
            btnRestartText.textContent = text || 'New Game';
        }
    }

    function updateCodePeekUI() {
        if (!gameRoomCodeInput) return;
        gameRoomCodeInput.value = isCodeRevealed ? (roomCode || '') : '******';
        if (isCodeRevealed) {
            if (iconEyeClosed) iconEyeClosed.classList.add('hidden');
            if (iconEyeOpen) iconEyeOpen.classList.remove('hidden');
        } else {
            if (iconEyeClosed) iconEyeClosed.classList.remove('hidden');
            if (iconEyeOpen) iconEyeOpen.classList.add('hidden');
        }
    }

    function restoreBoardUI() {
        rematchRequested = { me: false, opponent: false };
        setRestartButtonState('restart', 'New Game');
        if (isGameActive) {
            btnRestart.classList.add('hidden');
        } else {
            btnRestart.classList.remove('hidden');
        }

        cells.forEach((cell, i) => {
            const symbol = boardState[i];
            cell.className = 'cell';
            if (symbol) {
                cell.innerHTML = symbol === 'X' ? SVG_X : SVG_O;
                cell.classList.add(symbol.toLowerCase());
                cell.setAttribute('disabled', 'true');
            } else {
                cell.innerHTML = '';
                cell.removeAttribute('disabled');
            }
        });
    }

    function renderGameEndUI(winner, winCombo) {
        isGameActive = false;
        setRestartButtonState('restart', 'New Game');
        btnRestart.classList.remove('hidden');

        if (winner === 'draw') {
            statusText.textContent = 'Draw!';
            statusIcon.innerHTML = '🤝';
        } else {
            if (winCombo) {
                winCombo.forEach(i => cells[i].classList.add(`winner-${winner.toLowerCase()}`));
            }
            if (currentMode === 'online') {
                statusText.textContent = winner === mySymbol ? 'You Win!' : 'Opponent Wins!';
                statusIcon.innerHTML = '🏆';
            } else {
                statusText.textContent = 'Winner';
                statusIcon.innerHTML = winner === 'X' ? STATUS_SVG_X : STATUS_SVG_O;
            }
        }
    }

    function startOnlineGame() {
        showScreen(screenGame);
        updatePlayerIdentityUI();
        resetBoard();
        updateScoresUI();
    }

    function updatePlayerIdentityUI() {
        if (currentMode === 'online') {
            const isX = mySymbol === 'X';
            boxX.classList.toggle('player-self', isX);
            boxO.classList.toggle('player-self', !isX);

            // Only host can see room code and invite link in game
            if (myRole === 'host') {
                if (hostInviteBar) hostInviteBar.classList.remove('hidden');
                updateCodePeekUI();
            } else {
                if (hostInviteBar) hostInviteBar.classList.add('hidden');
            }
        } else {
            boxX.classList.remove('player-self');
            boxO.classList.remove('player-self');
            if (hostInviteBar) hostInviteBar.classList.add('hidden');
        }
    }

    // ==========================================
    // GAME ENGINE
    // ==========================================

    function resetGameLocal() {
        scores = { X: 0, O: 0, draw: 0 };
        startingSymbol = 'X';
        resetBoard();
        updateScoresUI();
    }

    function prepareNextRoundTurn() {
        startingSymbol = startingSymbol === 'X' ? 'O' : 'X';
        currentTurn = startingSymbol;
    }

    function resetBoard() {
        boardState = Array(9).fill(null);
        isGameActive = true;
        lastWinner = null;
        lastWinCombo = null;
        rematchRequested = { me: false, opponent: false };

        setRestartButtonState('restart', 'New Game');
        btnRestart.classList.add('hidden');

        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.className = 'cell';
            cell.removeAttribute('disabled');
        });

        currentTurn = startingSymbol;
        updateTurnUI();
    }

    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            const index = parseInt(cell.getAttribute('data-index'));

            if (!isGameActive || boardState[index] !== null) return;

            if (currentMode === 'online') {
                if (!gameChannel || !isOpponentConnected) {
                    showToast("Opponent is disconnected!");
                    return;
                }
                if (currentTurn !== mySymbol) {
                    showToast("Opponent's turn!");
                    return;
                }
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
        lastWinner = winner;
        lastWinCombo = winCombo;
        setRestartButtonState('restart', 'New Game');
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
            prepareNextRoundTurn();
            resetBoard();
        } else {
            if (!gameChannel || !isOpponentConnected) {
                leaveToMainMenu();
                return;
            }
            if (rematchRequested.me) return;

            rematchRequested.me = true;
            setRestartButtonState('restart', 'Waiting...');
            sendData({ type: 'REMATCH_REQUEST' });

            if (rematchRequested.opponent && myRole === 'host') {
                prepareNextRoundTurn();
                sendData({
                    type: 'REMATCH_ACCEPT',
                    startingSymbol: startingSymbol
                });
                resetBoard();
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
        if (!container) return;

        const elem = document.createElement('div');
        elem.className = 'floating-emoji';
        elem.textContent = emoji;

        const centerX = window.innerWidth / 2;
        const maxSpread = Math.min(window.innerWidth * 0.8, 720);
        const spreadX = (Math.random() - 0.5) * maxSpread;
        const startBottom = 25 + Math.random() * 30;

        elem.style.left = `${centerX + spreadX}px`;
        elem.style.bottom = `${startBottom}px`;

        container.appendChild(elem);
        setTimeout(() => elem.remove(), 2300);
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

    if (btnTogglePeek) {
        btnTogglePeek.addEventListener('click', () => {
            isCodeRevealed = !isCodeRevealed;
            updateCodePeekUI();
        });
    }

    if (btnCopyGameCode) {
        btnCopyGameCode.addEventListener('click', () => {
            if (roomCode) copyText(roomCode, 'Room code copied!');
        });
    }

    if (gameRoomCodeInput) {
        gameRoomCodeInput.addEventListener('click', () => {
            if (roomCode) copyText(roomCode, 'Room code copied!');
        });
    }

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

    let sharedAudioCtx = null;

    function getAudioContext() {
        if (!sharedAudioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                sharedAudioCtx = new AudioCtx();
            }
        }
        if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
            sharedAudioCtx.resume().catch(() => {});
        }
        return sharedAudioCtx;
    }

    function playSound(type) {
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

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
            } else if (type === 'lose') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(392.00, now);
                osc.frequency.setValueAtTime(329.63, now + 0.12);
                osc.frequency.setValueAtTime(261.63, now + 0.24);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now);
                osc.stop(now + 0.4);
            } else if (type === 'draw') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(370, now);
                osc.frequency.setValueAtTime(330, now + 0.1);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (e) {}
    }

    // Initial check for direct URL join
    const hasRoomParam = checkUrlRoomParam();
    if (!hasRoomParam) {
        showScreen(screenMenu);
    }
});
