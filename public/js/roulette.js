document.addEventListener('DOMContentLoaded', () => {
    // --- quick safety checks for required DOM nodes ---
    const canvas = document.getElementById('rouletteCanvas');
    const balanceDisplay = document.getElementById('balance');
    const spinBtn = document.getElementById('spinBtn');
    const clearWagersBtn = document.getElementById('clearWagersBtn');
    const undoWagerBtn = document.getElementById('undoWagerBtn');
    const countdownTimerDisplay = document.getElementById('countdownTimer');
    const resultText = document.getElementById('resultText');
    const spinModal = document.getElementById('spinModal');
    const winningNumberDisplay = document.getElementById('winningNumberDisplay');
    const chipPalette = document.getElementById('chipPalette');

    if (!canvas || !balanceDisplay || !spinBtn || !clearWagersBtn || !undoWagerBtn || !countdownTimerDisplay || !resultText || !winningNumberDisplay) {
        console.error('Missing required DOM elements for roulette. Aborting init.');
        return;
    }

    const ctx = canvas.getContext('2d');

    // --- HiDPI scaling for crisp canvas ---
    function scaleCanvasForHiDPI(width, height) {
        const ratio = window.devicePixelRatio || 1;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // scale drawing operations
    }

    // Canvas Dimensions (Set based on your desired layout size)
    const BOARD_WIDTH = 900;
    const BOARD_HEIGHT = 400;
    scaleCanvasForHiDPI(BOARD_WIDTH, BOARD_HEIGHT);

    // Grid Dimensions
    const NUMBER_COLS = 12;
    const NUMBER_ROWS = 3;
    const ZERO_CELL_WIDTH = 50;
    const COL_WIDTH = (BOARD_WIDTH - ZERO_CELL_WIDTH) / (NUMBER_COLS + 1); // 13 columns total (12 numbers + 1 for COL bets)
    
    // Recalculate based on 13 equal columns total *after* zero
    const NUMBER_COLUMNS_PLUS_ONE = 13; // 12 number columns + 1 column for COL bets
    const GRID_AREA_WIDTH = BOARD_WIDTH - ZERO_CELL_WIDTH;
    const INSIDE_CELL_WIDTH = GRID_AREA_WIDTH / NUMBER_COLUMNS_PLUS_ONE;
    const ROW_HEIGHT = BOARD_HEIGHT / (NUMBER_ROWS + 2); // 3 rows + 2 outside rows
    
    const OUTSIDE_12_HEIGHT = ROW_HEIGHT;
    const OUTSIDE_1_1_HEIGHT = ROW_HEIGHT;

    // Corrected column width for numbers (12 columns)
    const NUMBER_COL_WIDTH = INSIDE_CELL_WIDTH;
    const COL_BET_WIDTH = INSIDE_CELL_WIDTH; // Width of the 1st COL, 2nd COL, 3rd COL cells

    // --- GAME STATE & CONSTANTS ---
    let currentChipValue = 10;
    let userBalance = parseFloat(balanceDisplay.textContent) || 0;
    let totalWagered = 0;
    let activeWagers = []; // { spot: '15', amount: 50, x: 100, y: 200, value: 50 }
    let lastWagers = [];
    
    let countdown = 30;
    let timerInterval;
    let isBettingOpen = true;

    // Data for Drawing and Payouts
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const NUMBERS_GRID = [
        [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
        [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    ];
    
    // Chip Colors (for visual representation)
    const CHIP_COLORS = { 10: '#9b59b6', 50: '#3498db', 100: '#e74c3c', 500: '#f1c40f' };
    
    // Payout Multipliers (not including return of original bet)
    const PAYOUTS = {
        'straight_up': 35, // Single number bet (including 0)
        'col': 2, 'd': 2, // Column/Dozen bets
        'half': 1, 'color': 1, 'parity': 1 // 1:1 bets
    };


    // --- CORE DRAWING FUNCTIONS ---

    function drawGrid() {
        // Clear canvas and set background
        ctx.fillStyle = '#015330'; // Dark Green Base
        ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

        // Set common text alignment for grid text
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // A. Draw Zero Cell
        ctx.fillStyle = 'green';
        ctx.fillRect(0, 0, ZERO_CELL_WIDTH, ROW_HEIGHT * NUMBER_ROWS);

        ctx.fillStyle = 'white';
        ctx.fillText('0', ZERO_CELL_WIDTH / 2, (ROW_HEIGHT * NUMBER_ROWS) / 2);

        // B. Draw 3x12 Number Cells
        for (let col = 0; col < NUMBER_COLS; col++) {
            for (let row = 0; row < NUMBER_ROWS; row++) {
                const number = NUMBERS_GRID[row][col];
                const x = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * col;
                const y = ROW_HEIGHT * row;

                // Set cell color
                ctx.fillStyle = RED_NUMBERS.includes(number) ? 'red' : 'black';
                ctx.fillRect(x, y, NUMBER_COL_WIDTH, ROW_HEIGHT);

                // Draw number text (white)
                ctx.fillStyle = 'white';
                ctx.fillText(number.toString(), x + NUMBER_COL_WIDTH / 2, y + ROW_HEIGHT / 2);

                // Draw borders
                ctx.strokeStyle = '#666';
                ctx.strokeRect(x, y, NUMBER_COL_WIDTH, ROW_HEIGHT);
            }
        }

        // C. Draw Outside Bets (Dozens, Columns, 1:1 Bets)
        
        // C1. Dozens (1st 12, 2nd 12, 3rd 12)
        for (let i = 0; i < 3; i++) {
            const x = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * (i * 4);
            const y = ROW_HEIGHT * NUMBER_ROWS; // Below the number grid
            const w = NUMBER_COL_WIDTH * 4;
            
            ctx.fillStyle = '#015330'; // Green
            ctx.fillRect(x, y, w, OUTSIDE_12_HEIGHT);
            
            ctx.fillStyle = 'white';
            const label = i === 0 ? '1st 12' : (i === 1 ? '2nd 12' : '3rd 12');
            ctx.fillText(label, x + w / 2, y + OUTSIDE_12_HEIGHT / 2);
            ctx.strokeRect(x, y, w, OUTSIDE_12_HEIGHT);
        }
        
        // C2. 1:1 Bets (Low/High, Even/Odd, Red/Black)
        const ONE_TO_ONE_SPOTS = ['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'];
        const ONE_TO_ONE_WIDTH = (GRID_AREA_WIDTH - COL_BET_WIDTH) / ONE_TO_ONE_SPOTS.length; // Uses the 12 number columns width
        const ONE_TO_ONE_Y = ROW_HEIGHT * NUMBER_ROWS + OUTSIDE_12_HEIGHT;
        
        ONE_TO_ONE_SPOTS.forEach((spot, i) => {
            const x = ZERO_CELL_WIDTH + ONE_TO_ONE_WIDTH * i;
            ctx.fillStyle = (spot === 'RED') ? 'red' : (spot === 'BLACK') ? 'black' : '#015330';
            
            ctx.fillRect(x, ONE_TO_ONE_Y, ONE_TO_ONE_WIDTH, OUTSIDE_1_1_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.fillText(spot, x + ONE_TO_ONE_WIDTH / 2, ONE_TO_ONE_Y + OUTSIDE_1_1_HEIGHT / 2);
            ctx.strokeRect(x, ONE_TO_ONE_Y, ONE_TO_ONE_WIDTH, OUTSIDE_1_1_HEIGHT);
        });

        // C3. Column Bets (3rd COL, 2nd COL, 1st COL) - placed outside the grid to the right
        const COL_BET_X = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * NUMBER_COLS;
        for (let row = 0; row < NUMBER_ROWS; row++) {
            const y = ROW_HEIGHT * row;
            ctx.fillStyle = '#015330';
            ctx.fillRect(COL_BET_X, y, COL_BET_WIDTH, ROW_HEIGHT);
            
            ctx.fillStyle = 'white';
            ctx.fillText(`${3 - row}rd COL`, COL_BET_X + COL_BET_WIDTH / 2, y + ROW_HEIGHT / 2);
            ctx.strokeRect(COL_BET_X, y, COL_BET_WIDTH, ROW_HEIGHT);
        }
    }

    /**
     * Draws all active balance on the canvas.
     */
    function drawChips() {
        const CHIP_RADIUS = 15;
        // ensure chip text uses centered alignment
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';

        activeWagers.forEach(wager => {
            ctx.beginPath();
            
            // Draw chip background (color)
            ctx.fillStyle = CHIP_COLORS[wager.value] || '#ffffff';
            ctx.arc(wager.x, wager.y, CHIP_RADIUS, 0, Math.PI * 2);
            ctx.fill();

            // Draw chip border
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw chip value text
            ctx.fillStyle = '#333';
            ctx.fillText(wager.value.toString(), wager.x, wager.y);
        });
    }

    /**
     * Main render loop. Redraws the board and all balance.
     */
    function render() {
        drawGrid();
        drawChips();
    }

    // --- HIT DETECTION & BETTING LOGIC ---
    
    function getBettingSpot(x, y) {
        // 1. Zero Cell Check
        if (x >= 0 && x < ZERO_CELL_WIDTH && y >= 0 && y < ROW_HEIGHT * NUMBER_ROWS) {
            return { spot: '0', type: 'straight_up', x: ZERO_CELL_WIDTH / 2, y: (ROW_HEIGHT * NUMBER_ROWS) / 2 };
        }

        // 2. Main 3x12 Grid Check (Straight Up numbers)
        const GRID_END_X = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * NUMBER_COLS;
        if (x >= ZERO_CELL_WIDTH && x < GRID_END_X && y >= 0 && y < ROW_HEIGHT * NUMBER_ROWS) {
            const col = Math.floor((x - ZERO_CELL_WIDTH) / NUMBER_COL_WIDTH);
            const row = Math.floor(y / ROW_HEIGHT);
            
            const number = NUMBERS_GRID[row][col];
            const spotX = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * col + NUMBER_COL_WIDTH / 2;
            const spotY = ROW_HEIGHT * row + ROW_HEIGHT / 2;
            
            return { spot: number.toString(), type: 'straight_up', x: spotX, y: spotY };
        }
        
        // 3. Column Bets Check (To the right of the 3x12 grid)
        const COL_BET_X = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * NUMBER_COLS;
        if (x >= COL_BET_X && x < COL_BET_X + COL_BET_WIDTH && y >= 0 && y < ROW_HEIGHT * NUMBER_ROWS) {
            const row = Math.floor(y / ROW_HEIGHT);
            
            // 0 -> 3rd COL, 1 -> 2nd COL, 2 -> 1st COL
            const colLabel = 3 - row;
            const spot = `col${colLabel}`;

            const spotX = COL_BET_X + COL_BET_WIDTH / 2;
            const spotY = ROW_HEIGHT * row + ROW_HEIGHT / 2;
            
            return { spot, type: 'col', x: spotX, y: spotY };
        }


        // 4. Dozens and 1:1 Bets (Rows below the number grid, starts after ZERO_CELL_WIDTH)
        if (x >= ZERO_CELL_WIDTH && y >= ROW_HEIGHT * NUMBER_ROWS) {
            const clickX = x - ZERO_CELL_WIDTH;

            // Dozens row (first row below number grid)
            if (y < ROW_HEIGHT * NUMBER_ROWS + OUTSIDE_12_HEIGHT) {
                const dozenIndex = Math.floor(clickX / (NUMBER_COL_WIDTH * 4));
                if (dozenIndex >= 0 && dozenIndex < 3) {
                    const spot = `d${dozenIndex + 1}`;
                    const spotX = ZERO_CELL_WIDTH + NUMBER_COL_WIDTH * (dozenIndex * 4) + (NUMBER_COL_WIDTH * 4) / 2;
                    const spotY = ROW_HEIGHT * NUMBER_ROWS + OUTSIDE_12_HEIGHT / 2;
                    return { spot, type: 'd', x: spotX, y: spotY };
                }
            }
            
            // One-to-one row (bottom-most)
            if (y >= ROW_HEIGHT * NUMBER_ROWS + OUTSIDE_12_HEIGHT) {
                const ONE_TO_ONE_SPOTS = ['1-18', 'EVEN', 'RED', 'BLACK', 'ODD', '19-36'];
                const ONE_TO_ONE_WIDTH = (GRID_AREA_WIDTH - COL_BET_WIDTH) / ONE_TO_ONE_SPOTS.length;
                const spotIndex = Math.floor(clickX / ONE_TO_ONE_WIDTH);
                
                if (spotIndex >= 0 && spotIndex < ONE_TO_ONE_SPOTS.length) {
                    const spot = ONE_TO_ONE_SPOTS[spotIndex];
                    const spotType = spot === 'RED' || spot === 'BLACK' ? 'color' : (spot === 'EVEN' || spot === 'ODD' ? 'parity' : 'half');
                    const spotX = ZERO_CELL_WIDTH + ONE_TO_ONE_WIDTH * spotIndex + ONE_TO_ONE_WIDTH / 2;
                    const spotY = ROW_HEIGHT * NUMBER_ROWS + OUTSIDE_12_HEIGHT + OUTSIDE_1_1_HEIGHT / 2;
                    return { spot, type: spotType, x: spotX, y: spotY };
                }
            }
        }

        return null; // No valid betting spot found
    }

    /**
     * Places a chip element visually on canvas and updates the game state.
     */
    function placeWagerCanvas(spotData, amount) {
        if (!isBettingOpen) {
            resultText.textContent = "Bets are closed. Wait for the next round!";
            return;
        }

        if (userBalance < amount) {
            resultText.textContent = `You need ৳${amount} to place this bet. Current balance: ৳${userBalance}`;
            return;
        }

        // Update Game State
        userBalance -= amount;
        totalWagered += amount;
        
        // Store wager details
        const wagerData = {
            spot: spotData.spot,
            type: spotData.type,
            amount: amount,
            value: amount,
            x: spotData.x, 
            y: spotData.y
        };

        activeWagers.push(wagerData);
        lastWagers = [...activeWagers];

        // Update UI
        updateBalanceDisplay();
        render(); // Redraw canvas to show the new chip
        resultText.textContent = `Bet ৳${amount} placed on ${spotData.spot}. Total Wagered: ৳${totalWagered}.`;
    }

    // --- GAME LOGIC FUNCTIONS ---

    function updateBalanceDisplay() {
        balanceDisplay.textContent = userBalance.toFixed(0);
        const disable = activeWagers.length === 0 || !isBettingOpen;
        // Spin button should only be enabled if bets were placed and betting is closed
        spinBtn.disabled = !activeWagers.length || isBettingOpen; 
        clearWagersBtn.disabled = disable;
        undoWagerBtn.disabled = disable;
    }

    function selectChip(value, targetBtn) {
        if (!chipPalette) return;
        chipPalette.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
        if (targetBtn) targetBtn.classList.add('active');
        currentChipValue = value;
        resultText.textContent = `Wagering ৳${currentChipValue}. Click a spot to place a bet.`;
    }

    function undoLastWager() {
        if (!isBettingOpen || activeWagers.length === 0) return;

        const lastBet = activeWagers.pop();
        if (lastBet) {
            userBalance += lastBet.amount;
            totalWagered -= lastBet.amount;
            updateBalanceDisplay();
            render(); // Redraw canvas
            resultText.textContent = `Undo successful. Returned ৳${lastBet.amount}. Total Wagered: ৳${totalWagered}.`;
        }
    }

    function clearAllWagers() {
        if (!isBettingOpen || activeWagers.length === 0) return;

        userBalance += totalWagered;
        totalWagered = 0;
        activeWagers = [];
        lastWagers = [];

        updateBalanceDisplay();
        render(); // Redraw canvas
        resultText.textContent = "All wagers cleared. Place your bets!";
    }
    
    function startTimer() {
        isBettingOpen = true;
        spinBtn.disabled = true;
        countdown = 30;
        countdownTimerDisplay.textContent = countdown;
        resultText.textContent = "Bets are open! Place your wagers now.";
        
        if (timerInterval) clearInterval(timerInterval); // Clear any existing interval
        
        timerInterval = setInterval(() => {
            countdown--;
            countdownTimerDisplay.textContent = countdown;
            
            if (countdown <= 5) countdownTimerDisplay.classList.add('warning');

            if (countdown <= 0) {
                clearInterval(timerInterval);
                isBettingOpen = false;
                countdownTimerDisplay.textContent = "0";
                countdownTimerDisplay.classList.remove('warning');
                resultText.textContent = "NO MORE BETS! Spinning...";
                
                if (activeWagers.length > 0) {
                    spinBtn.disabled = false;
                    clearWagersBtn.disabled = true;
                    undoWagerBtn.disabled = true;
                } else {
                    simulateSpin(); // Auto-spin if no bets
                }
            }
        }, 1000);
    }
    
    /**
     * Checks a wager against the winning number.
     * NOTE: Simplified check for straight and outside bets.
     */
    function checkWinnings(wager, winningNumber) {
        const num = winningNumber;
        const spot = wager.spot;
        let isWinner = false;

        // 1. Straight Up Bet (Single Number)
        if (wager.type === 'straight_up' && spot === num.toString()) {
            isWinner = true;
        }
        
        // --- OUTSIDE BETS ---
        if (num === 0) return false; // All outside bets lose on 0

        // 2. Dozens (d1, d2, d3)
        if (wager.type === 'd') {
            if (spot === 'd1' && num >= 1 && num <= 12) isWinner = true;
            if (spot === 'd2' && num >= 13 && num <= 24) isWinner = true;
            if (spot === 'd3' && num >= 25 && num <= 36) isWinner = true;
        }

        // 3. Columns (col1, col2, col3) - Row 1 is 1st COL (1, 4, 7...)
        if (wager.type === 'col') {
            if (spot === 'col1' && num % 3 === 1) isWinner = true;
            if (spot === 'col2' && num % 3 === 2) isWinner = true;
            if (spot === 'col3' && num % 3 === 0) isWinner = true;
        }

        // 4. Halves (1-18, 19-36)
        if (wager.type === 'half') {
            if (spot === '1-18' && num >= 1 && num <= 18) isWinner = true;
            if (spot === '19-36' && num >= 19 && num <= 36) isWinner = true;
        }

        // 5. Parity (EVEN, ODD)
        if (wager.type === 'parity') {
            if (spot === 'EVEN' && num % 2 === 0) isWinner = true;
            if (spot === 'ODD' && num % 2 !== 0) isWinner = true;
        }

        // 6. Color (RED, BLACK)
        if (wager.type === 'color') {
            const isRed = RED_NUMBERS.includes(num);
            if (spot === 'RED' && isRed) isWinner = true;
            if (spot === 'BLACK' && !isRed) isWinner = true;
        }

        // If it's a winner, calculate the return (Original Bet * (Payout Multiplier + 1))
        if (isWinner) {
            const payoutKey = wager.type === 'straight_up' ? 'straight_up' : wager.type.slice(0, 3); // Gets 'str', 'col', 'par', 'hal', 'col'
            const multiplier = PAYOUTS[payoutKey] || 1; // Default to 1:1 if not found
            return wager.amount * (multiplier + 1);
        }

        return 0;
    }


    function simulateSpin() {
        spinBtn.disabled = true;
        if (spinModal) spinModal.classList.remove('hidden');

        // Determine Winning Number (0 to 36)
        const winningNumber = Math.floor(Math.random() * 37); 
        const winningColor = (winningNumber === 0) ? 'green' : (RED_NUMBERS.includes(winningNumber) ? 'red' : 'black');
        
        setTimeout(() => {
            if (winningNumberDisplay) {
                winningNumberDisplay.textContent = winningNumber;
                winningNumberDisplay.className = `score neon-title winning-${winningColor}`;
            }
            
            // --- Payout Logic ---
            let totalWinnings = 0;
            activeWagers.forEach(w => {
                totalWinnings += checkWinnings(w, winningNumber);
            });
            
            // Clear board and update balance
            activeWagers = [];
            totalWagered = 0;
            userBalance += totalWinnings;
            updateBalanceDisplay();
            render(); // Clear balance from canvas

            resultText.textContent = `Winning Number: ${winningNumber} (${winningColor.toUpperCase()}). You won ৳${totalWinnings.toFixed(0)}.`;

            setTimeout(() => {
                if (spinModal) spinModal.classList.add('hidden');
                startTimer();
            }, 3000);

        }, 1500); 
    }

    // --- EVENT LISTENERS ---

    // Chip Palette Selection
    if (chipPalette) {
        chipPalette.addEventListener('click', (e) => {
            const btn = e.target.closest('.chip-btn');
            // Ensure button and data-value exist before calling selectChip
            if (btn && btn.dataset.value) selectChip(parseInt(btn.dataset.value, 10), btn);
        });
    }

    // Place Wager on Canvas
    canvas.addEventListener('click', (e) => {
        if (!isBettingOpen) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const spotData = getBettingSpot(x, y);
        
        if (spotData) {
            placeWagerCanvas(spotData, currentChipValue);
        }
    });

    // Action Buttons
    spinBtn.addEventListener('click', simulateSpin);
    clearWagersBtn.addEventListener('click', clearAllWagers);
    undoWagerBtn.addEventListener('click', undoLastWager);

    // --- INITIALIZATION ---
    updateBalanceDisplay();
    startTimer();
    render(); // Initial draw of the board
});