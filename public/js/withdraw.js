// ==================== withdrawal.js ====================

// Static conversion example (USD → BDT)
const usdToBdt = 122.24;

// Localization keys (match deposit's style)
const L = {
    amountMustBe: 'Amount must be between',
    and: 'and',
    equivalentInBdt: 'Equivalent in BDT',
    pleaseEnterValid: 'Please enter a valid amount',
    conversionError: 'Conversion resulted in too low BDT amount',
    insufficientBalance: 'Insufficient Balance',
    minAmount: 'Minimum amount is',
    balanceOK: 'Balance is sufficient',
    bdt: 'BDT',
    enterAmount: 'Enter Amount'
};

// ---------------- Tabs & Modal open/close (same as deposit.js) ----------------
document.querySelectorAll('.sidebar-menu li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

const cards = document.querySelectorAll('.payment-card');
const closes = document.querySelectorAll('.close');
const modals = document.querySelectorAll('.modal');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');

cards.forEach(card => {
    const modal = document.getElementById(card.dataset.modal);
    card.addEventListener('click', () => {
        if (!isLoggedIn) {
            loginModal.classList.add('show');
        } else {
            modal.style.display = 'flex';
            // if modal has inputs, trigger validation just in case of prefilled values
            modal.querySelectorAll('input').forEach(i => i.dispatchEvent(new Event('input')));
        }
    });
});

closes.forEach(c => c.addEventListener('click', () => c.closest('.modal').style.display = 'none'));

window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    if (e.target === loginModal) loginModal.classList.remove('show');
});
if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.classList.remove('show'));

// ---------------- Validation utility (mirrors deposit.js) ----------------
/**
 * validateAmount - generic validation like deposit.js
 * @param {string} inputId - id of the USD input
 * @param {string} feedbackId - id of the feedback div
 * @param {number} minUsd - minimum USD allowed
 * @param {number|null} maxUsd - maximum USD allowed (null for no max)
 * @param {boolean} showBdt - whether to show BDT equivalent in feedback
 * @param {string|null} bdtInputId - id of a hidden BDT input to populate (optional)
 * @returns {Function} handler - the handler function that also returns boolean validation status
 */
function validateAmount(inputId, feedbackId, minUsd, maxUsd = null, showBdt = false, bdtInputId = null) {
    const amountInput = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const bdtInput = bdtInputId ? document.getElementById(bdtInputId) : null;

    if (!amountInput || !feedback) {
        // If element missing, return a dummy validator that returns false
        return () => false;
    }

    const handler = () => {
        const raw = amountInput.value;
        const value = parseFloat(raw);

        if (isNaN(value) || value <= 0) {
            feedback.textContent = '';
            feedback.className = 'amount-feedback';
            if (bdtInput) bdtInput.value = '';
            return false;
        }

        let isValid = true;
        let bdtEquivalent = value * usdToBdt;

        // Min check
        if (value < minUsd) {
            feedback.textContent = `${L.minAmount} ${minUsd} ${L.bdt}.`;
            feedback.className = 'amount-feedback amount-invalid';
            isValid = false;
        } else if (maxUsd !== null && value > maxUsd) {
            // Max check, if max provided
            feedback.textContent = `${L.amountMustBe} ${minUsd} USD ${L.and} ${maxUsd} USD`;
            feedback.className = 'amount-feedback amount-invalid';
            isValid = false;
        } else {
            // Passed min/max checks — show BDT if requested
            if (showBdt) {
                const display = bdtEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 });
                feedback.textContent = `${L.equivalentInBdt}: ৳${display}`;
            } else {
                feedback.textContent = '';
            }
            feedback.className = 'amount-feedback amount-valid';
        }

        if (bdtInput) bdtInput.value = isValid ? bdtEquivalent.toFixed(2) : '';
        return isValid;
    };

    amountInput.addEventListener('input', handler);
    // run once on registration
    handler();
    return handler;
}

// ---------------- Withdrawal-specific validation & setup ----------------
// Per your instruction:
// E-wallets min $10 (max kept at 200 like deposit)
// Crypto withdrawals min $50 (max 1000 like deposit crypto)
// Binance keep same as deposit: min 5 max 500

// E-Wallets (show BDT equivalent)
const bkashValidator = validateAmount('bkashAmount', 'bkashFeedback', 10, 200, true /* showBdt */ , null);
const nagadValidator = validateAmount('nagadAmount', 'nagadFeedback', 10, 200, true, null);
const upayValidator = validateAmount('upayAmount', 'upayFeedback', 10, 200, true, null);

// Binance (no BDT preview here; adjust if you want it)
const binanceValidator = validateAmount('binanceAmount', 'binanceFeedback', 5, 500, false, 'binanceBdtAmount');

// Crypto withdrawal (modal not present in original HTML — if you add it later, use ids 'cryptoAmount' & 'cryptoFeedback')
const cryptoValidator = validateAmount('cryptoAmount', 'cryptoFeedback', 50, 1000, false);

// ---------------- Form submit guards ----------------
/**
 * attachSubmitGuard - ensures final validation on submit and prevents submit if invalid
 * @param {HTMLFormElement|null} form
 * @param {Function|null} validator - the handler returned from validateAmount
 * @param {Function|null} extraCheck - optional extra check function returning true/false
 */
function attachSubmitGuard(form, validator, extraCheck = null) {
    if (!form) return;
    form.addEventListener('submit', e => {
        const isValid = validator ? validator() : true;
        if (!isValid) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
            return;
        }
        if (extraCheck && !extraCheck()) {
            e.preventDefault();
            alert(L.conversionError);
        }
        // otherwise allow submit
    });
}

// Attach for binance form if present
const binanceForm = document.getElementById('binanceForm');
attachSubmitGuard(binanceForm, binanceValidator, () => {
    // Example extra conversion check: If binanceBdtAmount is required to be >= 10 BDT (change as needed)
    const bdtField = document.getElementById('binanceBdtAmount');
    if (!bdtField) return true;
    const val = parseFloat(bdtField.value);
    return !isNaN(val) ? val >= 10 : false;
});

// Attach for crypto modal form if present
const cryptoForm = document.querySelector('#modal-crypto form');
attachSubmitGuard(cryptoForm, cryptoValidator);

// If you have forms for bkash/nagad/upay, attach guards to prevent submits when confirm button disabled
['bkash', 'nagad', 'upay'].forEach(method => {
    const form = document.querySelector(`#modal-${method} form`);
    const validator = method === 'bkash' ? bkashValidator : method === 'nagad' ? nagadValidator : upayValidator;
    attachSubmitGuard(form, validator);
});

// ---------------- Button enable/disable sync (ensures confirm buttons are disabled if invalid) ----------------
// This will keep Confirm buttons in sync with validators
function syncConfirmButton(amountId, validatorFn, buttonId) {
    const amountEl = document.getElementById(amountId);
    const btn = document.getElementById(buttonId);
    if (!amountEl || !btn || !validatorFn) return;
    const sync = () => {
        const ok = validatorFn();
        btn.disabled = !ok;
    };
    amountEl.addEventListener('input', sync);
    // run once
    sync();
}

// Apply sync for each method
syncConfirmButton('bkashAmount', bkashValidator, 'bkashConfirmBtn');
syncConfirmButton('nagadAmount', nagadValidator, 'nagadConfirmBtn');
syncConfirmButton('upayAmount', upayValidator, 'upayConfirmBtn');
syncConfirmButton('binanceAmount', binanceValidator, 'binanceConfirmBtn');

// If crypto modal exists and has a confirm button with id "cryptoConfirmBtn", hook it
syncConfirmButton('cryptoAmount', cryptoValidator, 'cryptoConfirmBtn');