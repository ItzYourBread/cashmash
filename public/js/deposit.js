// ==================== Deposit.js ====================

const usdToBdt = 122.24;

const L = {
    amountMustBe: 'Amount must be between',
    and: 'and',
    equivalentInBdt: 'Equivalent in BDT',
    pleaseEnterValid: 'Please enter a valid amount',
    conversionError: 'Conversion resulted in too low BDT amount',
};

// ---------------- Tabs ----------------
document.querySelectorAll('.sidebar-menu li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ---------------- Modal Handling ----------------
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');

// Generic closer
document.querySelectorAll('.close').forEach(c => {
    c.addEventListener('click', () => c.closest('.modal').style.display = 'none');
});

window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
    if (e.target === loginModal) loginModal.classList.remove('show');
});

if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.classList.remove('show'));

// ---------------- Validation Logic ----------------
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
            feedback.textContent = showBdt 
                ? `${L.equivalentInBdt}: ৳${bdtEquivalent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : '';
            feedback.className = 'amount-feedback amount-valid';
        }

        if (bdtInput) bdtInput.value = isValid ? bdtEquivalent.toFixed(2) : '';
        return isValid;
    };

    amountInput.addEventListener('input', handler);
    // Trigger immediately to clear states
    return handler; 
}

// ---------------- Init Validators ----------------
// 1. Generic Mobile Banking Validator (Bkash/Nagad/Upay)
const mbValidator = validateAmount('mbAmount', 'mbFeedback', 10, 200, false);

// 2. Binance Validator
const binanceValidator = validateAmount('binanceAmount', 'binanceFeedback', 10, 500, false, 'binanceBdtAmount');

// 3. Crypto Validator
const cryptoValidator = validateAmount('cryptoAmount', 'cryptoFeedback', 50, 1000, false);


// ---------------- Enable/Disable Buttons Logic ----------------
function enableWhenValid(amountId, validatorFn, buttonSelector, extraFieldId = null) {
    const amountEl = document.getElementById(amountId);
    const button = document.querySelector(buttonSelector);
    const extraField = extraFieldId ? document.getElementById(extraFieldId) : null;

    if (!amountEl || !button) return;

    const sync = () => {
        const amountOK = validatorFn ? validatorFn() : true;
        const extraOK = extraField ? extraField.value.trim().length > 0 : true;
        button.disabled = !(amountOK && extraOK);
    };

    amountEl.addEventListener("input", sync);
    if (extraField) extraField.addEventListener("input", sync);
}

// Attach button logic
enableWhenValid('mbAmount', mbValidator, '#modal-mobile-banking button[type="submit"]', 'mbTrxId');
enableWhenValid('binanceAmount', binanceValidator, '#modal-binance button[type="submit"]', 'binanceTxnId');
enableWhenValid('cryptoAmount', cryptoValidator, '#modal-crypto button[type="submit"]');


// ---------------- Dynamic Modal Openers ----------------

document.querySelectorAll('.payment-card').forEach(card => {
    card.addEventListener('click', () => {
        if (!isLoggedIn) {
            loginModal.classList.add('show');
            return;
        }

        const modalId = card.dataset.modal;
        const modal = document.getElementById(modalId);
        const provider = card.dataset.provider; // 'Bkash', 'Nagad', 'Upay'
        const currency = card.dataset.currency; // 'btc', 'eth', etc

        // LOGIC: Mobile Banking (Bkash, Nagad, Upay)
        if (modalId === 'modal-mobile-banking' && provider) {
            
            // 1. Random Agent Selection
            const agents = agentData[provider] || [];
            if(agents.length > 0) {
                const randomAgent = agents[Math.floor(Math.random() * agents.length)];
                document.getElementById('mb-agent-name').textContent = randomAgent.full_name;
                document.getElementById('mb-agent-number').textContent = randomAgent.contact;
            } else {
                document.getElementById('mb-agent-name').textContent = "System";
                document.getElementById('mb-agent-number').textContent = "Not available";
            }

            // 2. Set Titles and Actions
            document.getElementById('mb-title').textContent = `${provider} Deposit`;
            document.getElementById('mb-form').action = `/deposit/${provider.toLowerCase()}`;

            // 3. Clear previous inputs
            document.getElementById('mbAmount').value = '';
            document.getElementById('mbTrxId').value = '';
            document.getElementById('mbFeedback').textContent = '';
        } 
        
        // LOGIC: Crypto
        else if (modalId === 'modal-crypto' && currency) {
            document.getElementById('cryptoCurrency').value = currency;
            document.getElementById('cryptoTitle').textContent = `Crypto Deposit (${currency.toUpperCase()})`;
        }

        // Show Modal
        if(modal) {
            modal.style.display = 'flex';
            // Trigger validation to reset button state
            const input = modal.querySelector('input[type="number"]');
            if(input) input.dispatchEvent(new Event('input'));
        }
    });
});

// ---------------- Submit Guards ----------------
function attachSubmitGuard(formId, validatorFn) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', e => {
        if (!validatorFn()) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
        }
    });
}

attachSubmitGuard('mb-form', mbValidator);
attachSubmitGuard('binanceForm', binanceValidator);
attachSubmitGuard('modal-crypto', cryptoValidator); // Crypto modal form selector might need ID in EJS