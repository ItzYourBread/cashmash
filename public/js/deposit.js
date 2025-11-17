// ==================== Deposit.js (FULLY MERGED & FIXED) ====================

// Static conversion example (USD → BDT)
const usdToBdt = 122.24;

// Localization keys
const L = {
    amountMustBe: 'Amount must be between',
    and: 'and',
    equivalentInBdt: 'Equivalent in BDT',
    pleaseEnterValid: 'Please enter a valid amount',
    conversionError: 'Conversion resulted in too low BDT amount',
    bdt: 'BDT',
    enterAmount: 'Enter Amount'
};

// ---------------- Tabs switching ----------------
document.querySelectorAll('.sidebar-menu li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ---------------- Modals ----------------
const cards = document.querySelectorAll('.payment-card');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');

cards.forEach(card => {
    const modal = document.getElementById(card.dataset.modal);
    card.addEventListener('click', () => {
        if (!isLoggedIn) {
            loginModal.classList.add('show');
        } else {
            modal.style.display = 'flex';
            modal.querySelectorAll("input").forEach(i => i.dispatchEvent(new Event("input")));
        }
    });
});

document.querySelectorAll('.close').forEach(c => {
    c.addEventListener('click', () => c.closest('.modal').style.display = 'none');
});

window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    if (e.target === loginModal) loginModal.classList.remove('show');
});

if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.classList.remove('show'));

// ---------------- Validation Utility ----------------
function validateAmount(inputId, feedbackId, minUsd, maxUsd = null, showBdt = false, bdtInputId = null) {
    const amountInput = document.getElementById(inputId);
    const feedback = document.getElementById(feedbackId);
    const bdtInput = bdtInputId ? document.getElementById(bdtInputId) : null;

    if (!amountInput) return () => false;

    const handler = () => {
        const value = parseFloat(amountInput.value);

        if (isNaN(value) || value <= 0) {
            feedback.textContent = '';
            feedback.className = 'amount-feedback';
            if (bdtInput) bdtInput.value = '';
            return false;
        }

        let isValid = true;
        let bdtEquivalent = value * usdToBdt;

        if (value < minUsd || (maxUsd !== null && value > maxUsd)) {
            feedback.textContent = `${L.amountMustBe} ${minUsd} USD ${L.and} ${maxUsd} USD`;
            feedback.className = 'amount-feedback amount-invalid';
            isValid = false;
        } else {
            if (showBdt) {
                feedback.textContent = `${L.equivalentInBdt}: ৳${bdtEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
            } else {
                feedback.textContent = '';
            }
            feedback.className = 'amount-feedback amount-valid';
        }

        if (bdtInput) bdtInput.value = isValid ? bdtEquivalent.toFixed(2) : '';
        return isValid;
    };

    amountInput.addEventListener('input', handler);
    handler();
    return handler;
}

// ---------------- Deposit Validators ----------------
const bkashValidator   = validateAmount('bkashAmount', 'bkashFeedback', 10, 200, false);
const nagadValidator   = validateAmount('nagadAmount', 'nagadFeedback', 10, 200, false);
const upayValidator    = validateAmount('upayAmount', 'upayFeedback', 10, 200, false);
const binanceValidator = validateAmount('binanceAmount', 'binanceFeedback', 10, 500, false, 'binanceBdtAmount');
const cryptoValidator  = validateAmount('cryptoAmount', 'cryptoFeedback', 10, 1000, false);

// ---------------- Enable/Disable Submit Buttons ----------------
function enableWhenValid(amountId, validatorFn, button, extraFieldId = null) {
    const amountEl = document.getElementById(amountId);
    const extraField = extraFieldId ? document.getElementById(extraFieldId) : null;

    if (!amountEl || !button) return;

    const sync = () => {
        const amountOK = validatorFn ? validatorFn() : true;
        const extraOK = extraField ? extraField.value.trim().length > 0 : true;

        button.disabled = !(amountOK && extraOK);
    };

    amountEl.addEventListener("input", sync);
    if (extraField) extraField.addEventListener("input", sync);

    sync();
}

// ---------------- Apply to all deposit methods ----------------

// BKASH
enableWhenValid("bkashAmount", bkashValidator,
    document.querySelector('#modal-bkash button[type="submit"]')
);

// NAGAD
enableWhenValid("nagadAmount", nagadValidator,
    document.querySelector('#modal-nagad button[type="submit"]')
);

// UPAY
enableWhenValid("upayAmount", upayValidator,
    document.querySelector('#modal-upay button[type="submit"]')
);

// BINANCE → requires amount + Order ID
enableWhenValid("binanceAmount", binanceValidator,
    document.querySelector('#modal-binance button[type="submit"]'),
    "binanceTxnId" // make sure your input has id="binanceTxnId"
);

// CRYPTO → only amount field
enableWhenValid("cryptoAmount", cryptoValidator,
    document.querySelector('#modal-crypto button[type="submit"]')
);

// ---------------- Crypto Currency Selection ----------------
document.querySelectorAll('.payment-card[data-modal="modal-crypto"]').forEach(card => {
    card.addEventListener('click', () => {
        const currency = card.getAttribute('data-currency');
        document.getElementById('cryptoCurrency').value = currency;
        document.getElementById('cryptoTitle').textContent =
            `Crypto Deposit (${currency.toUpperCase()})`;
    });
});

// ---------------- Form Submit Guards ----------------
function attachSubmitGuard(form, validatorFn) {
    if (!form) return;
    form.addEventListener('submit', e => {
        if (!validatorFn()) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
        }
    });
}

// Attach submit guards
attachSubmitGuard(document.querySelector('#modal-bkash form'), bkashValidator);
attachSubmitGuard(document.querySelector('#modal-nagad form'), nagadValidator);
attachSubmitGuard(document.querySelector('#modal-upay form'), upayValidator);
attachSubmitGuard(document.querySelector('#binanceForm'), binanceValidator);
attachSubmitGuard(document.querySelector('#modal-crypto form'), cryptoValidator);
