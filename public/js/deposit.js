// ==================== Deposit.js ====================

// Static conversion example (USD → BDT)
const usdToBdt = 122.24;

// Tabs
document.querySelectorAll('.sidebar-menu li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Modals
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
        }
    });
});

closes.forEach(c => c.addEventListener('click', () => c.closest('.modal').style.display = 'none'));

window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    if (e.target === loginModal) loginModal.classList.remove('show');
});
if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.classList.remove('show'));

// ==================== Validation Function ====================
function validateAmount(inputId, feedbackId, minUsd, maxUsd, showBdt = false, bdtInputId = null) {
    const amountInput = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const bdtInput = bdtInputId ? document.getElementById(bdtInputId) : null;

    const handler = () => {
        const value = parseFloat(amountInput.value);

        if (isNaN(value) || value <= 0) {
            feedback.textContent = '';
            if (bdtInput) bdtInput.value = '';
            return false;
        }

        let isValid = true;
        let bdtEquivalent = value;

        if (value < minUsd || value > maxUsd) {
            feedback.textContent = `${L.amountMustBe} ${minUsd} USD ${L.and} ${maxUsd} USD`;
            feedback.className = 'amount-feedback amount-invalid';
            isValid = false;
        } else {
            if (showBdt) {
                bdtEquivalent = value * usdToBdt;
                const display = bdtEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 });
                feedback.textContent = `${L.equivalentInBdt}: ৳${display}`;
            } else {
                feedback.textContent = ``;
            }
            feedback.className = 'amount-feedback amount-valid';
        }

        if (bdtInput) bdtInput.value = isValid ? bdtEquivalent.toFixed(2) : '';
        return isValid;
    };

    amountInput.addEventListener('input', handler);
    return handler;
}

// ==================== E-Wallet Validations ====================
// E-Wallets show BDT equivalent of USD
validateAmount('bkashAmount', 'bkashFeedback', 5, 200, true, null);
validateAmount('nagadAmount', 'nagadFeedback', 5, 200, true, null);
validateAmount('upayAmount', 'upayFeedback', 5, 200, true, null);

// ==================== Binance Validation ====================
const binanceValidator = validateAmount('binanceAmount', 'binanceFeedback', 5, 500, false, 'binanceBdtAmount');
const binanceForm = document.getElementById('binanceForm');

if (binanceForm) {
    binanceForm.addEventListener('submit', e => {
        const isValid = binanceValidator();
        if (!isValid) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
            return;
        }

        const bdtField = document.getElementById('binanceBdtAmount');
        if (!bdtField || !bdtField.value || parseFloat(bdtField.value) < 10) {
            e.preventDefault();
            alert(L.conversionError);
        }
    });
}

// ==================== Crypto Modal (NOWPayments) ====================
const cryptoModal = document.getElementById('modal-crypto');
const cryptoCurrencyInput = document.getElementById('cryptoCurrency');
const cryptoTitle = document.getElementById('cryptoTitle');
const cryptoAmount = document.getElementById('cryptoAmount');

// Crypto validation: min 10 USD, max 1,000 USD
const cryptoValidator = validateAmount('cryptoAmount', 'cryptoFeedback', 10, 1000, false);

document.querySelectorAll('.payment-card[data-modal="modal-crypto"]').forEach(card => {
    card.addEventListener('click', () => {
        const currency = card.getAttribute('data-currency');
        cryptoCurrencyInput.value = currency;
        cryptoTitle.textContent = `Deposit with ${currency.toUpperCase().replace('USDT', 'USDT-')}`;
        cryptoModal.style.display = 'flex';
    });
});

cryptoModal.querySelector('.close').addEventListener('click', () => cryptoModal.style.display = 'none');
window.addEventListener('click', e => {
    if (e.target === cryptoModal) cryptoModal.style.display = 'none';
});

// Optional: submit validation for crypto
const cryptoForm = document.querySelector('#modal-crypto form');
if (cryptoForm) {
    cryptoForm.addEventListener('submit', e => {
        const isValid = cryptoValidator();
        if (!isValid) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
        }
    });
}
