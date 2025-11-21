// =========================================================
// Withdrawal Script (Production Ready & Safe)
// =========================================================

// ELEMENTS
const withdrawSelect = document.getElementById('withdrawMethodSelect');

// Wallet (Bkash/Nagad/Upay)
const walletFormWrap = document.getElementById('walletFormWrap');
const walletForm = document.getElementById('walletForm');
const walletTitle = document.getElementById('walletTitle');
const walletAmountInput = document.getElementById('walletAmount');
const walletFeedback = document.getElementById('walletFeedback');
const walletConfirmBtn = document.getElementById('walletConfirmBtn');

// Binance Pay
const binanceFormWrap = document.getElementById('binanceFormWrap');
const binanceForm = document.getElementById('binanceForm');
const binanceAmountInput = document.getElementById('binanceAmount');
const binanceFeedback = document.getElementById('binanceFeedback');
const binanceConfirmBtn = document.getElementById('binanceConfirmBtn');

// Crypto
const cryptoFormWrap = document.getElementById('cryptoFormWrap');
const cryptoForm = document.getElementById('cryptoForm');
const cryptoAmountInput = document.getElementById('cryptoAmount');
const cryptoFeedback = document.getElementById('cryptoFeedback');
const cryptoConfirmBtn = document.getElementById('cryptoConfirmBtn');
const cryptoWalletTitle = document.getElementById('cryptoWalletTitle');
const cryptoWalletInput = document.getElementById('cryptoWalletAddress'); // input for wallet address
const cryptoNetworkSelect = document.getElementById('cryptoNetwork'); // select for network

// =========================================================
// Hide all forms initially
// =========================================================
function hideAllForms() {
    if (walletFormWrap) walletFormWrap.classList.add('hidden');
    if (binanceFormWrap) binanceFormWrap.classList.add('hidden');
    if (cryptoFormWrap) cryptoFormWrap.classList.add('hidden');

    if (walletConfirmBtn) walletConfirmBtn.disabled = true;
    if (binanceConfirmBtn) binanceConfirmBtn.disabled = true;
    if (cryptoConfirmBtn) cryptoConfirmBtn.disabled = true;
}

hideAllForms();

// =========================================================
// Method selection
// =========================================================
if (withdrawSelect) {
    withdrawSelect.addEventListener('change', () => {
        hideAllForms();
        const method = withdrawSelect.value;

        // Wallet methods
        if (['bkash', 'nagad', 'upay'].includes(method) && walletFormWrap && walletTitle && walletForm) {
            walletFormWrap.classList.remove('hidden');
            walletTitle.textContent = `${method.charAt(0).toUpperCase() + method.slice(1)} Withdraw`;
            walletForm.dataset.method = method;
        }

        // BinancePay
        if (method === 'binance' && binanceFormWrap) {
            binanceFormWrap.classList.remove('hidden');
        }

        // Crypto
        if (method === 'crypto' && cryptoFormWrap && cryptoWalletTitle) {
            cryptoFormWrap.classList.remove('hidden');
            cryptoWalletTitle.textContent = 'Crypto Withdrawal';
        }
    });
}

// =========================================================
// Validation engine
// =========================================================
function initValidator(input, btn, feedback, min) {
    if (!input || !btn || !feedback) return;
    input.addEventListener('input', () => {
        const val = parseFloat(input.value);
        if (!val || val < min) {
            feedback.textContent = `Minimum amount is $${min}`;
            feedback.className = 'amount-feedback amount-invalid';
            btn.disabled = true;
            return;
        }
        feedback.textContent = '';
        feedback.className = 'amount-feedback amount-valid';
        btn.disabled = false;
    });
}

initValidator(walletAmountInput, walletConfirmBtn, walletFeedback, 10);
initValidator(binanceAmountInput, binanceConfirmBtn, binanceFeedback, 10);
initValidator(cryptoAmountInput, cryptoConfirmBtn, cryptoFeedback, 50);

// =========================================================
// Wallet submit (Bkash/Nagad/Upay)
if (walletForm) {
    walletForm.addEventListener('submit', e => {
        const method = walletForm.dataset.method;
        if (!method) {
            e.preventDefault();
            alert('Please select a valid withdrawal method');
            return;
        }
        walletForm.action = `/withdraw/${method}`;
    });
}

// =========================================================
// Binance Pay submit → natural form submission
// Crypto submit → natural form submission with network note
if (cryptoForm) {
    cryptoForm.addEventListener('submit', e => {
        if (!cryptoWalletInput || !cryptoNetworkSelect) return;

        // Attach network name as note
        const networkName = cryptoNetworkSelect.value || 'Unknown Network';
        const hiddenNoteInput = cryptoForm.querySelector('input[name="note"]');
        if (hiddenNoteInput) {
            hiddenNoteInput.value = `Network: ${networkName}`;
        }
    });
}

// =========================================================
// BD-only filtering for wallet methods
// =========================================================
try {
    if (typeof userCountry !== "undefined" && userCountry !== "BD") {
        ['bkash','nagad','upay'].forEach(id => {
            const option = document.querySelector(`option[value="${id}"]`);
            if (option) option.style.display = 'none';
        });
    }
} catch (_) {}
