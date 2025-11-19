// ==================== Deposit.js (full, production-ready) ====================

const L = {
    amountMustBe: 'Amount must be between',
    and: 'and',
    equivalentInBdt: 'Equivalent in BDT',
    pleaseEnterValid: 'Please enter a valid amount',
    conversionError: 'Conversion resulted in too low BDT amount',
};

// --- Tabs (left sidebar) ---
// uses data-tab attributes in your EJS
document.querySelectorAll('.sidebar-menu li').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-menu li').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.tab || tab.dataset.section;
        if (targetId) {
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        }
    });
});

// --- Modal helpers & global references ---
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');

function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
}

function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    // focus first input if exists
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput) firstInput.focus();
}

// Close-buttons
document.querySelectorAll('.close').forEach(c => {
    c.addEventListener('click', () => {
        const modal = c.closest('.modal');
        closeModal(modal);
    });
});

// Click outside to close
window.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        closeModal(e.target);
    }
});

// Escape key to close any open modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(m => closeModal(m));
        if (loginModal) loginModal.classList.remove('show');
    }
});

if (closeLoginModal) closeLoginModal.addEventListener('click', () => loginModal.classList.remove('show'));

// --- Utility: safe element getters ---
const $ = selector => document.querySelector(selector);
const $id = id => document.getElementById(id);

// --- COUNTRY FILTER (client-side safety) ---
// server-side already hides BD-only cards, but enforce client-side too
try {
    if (typeof userCountry !== 'undefined') {
        const bdOnly = ['Bkash', 'Nagad', 'Upay'];
        document.querySelectorAll('.payment-card').forEach(card => {
            const provider = card.dataset.provider;
            if (provider && bdOnly.includes(provider) && userCountry !== 'BD') {
                card.style.display = 'none';
            }
        });
    }
} catch (err) {
    // no-op if userCountry undefined
}

function validateAmount(inputId, feedbackId, minUsd, maxUsd = null, showBdt = true, bdtInputId = null) {
    const amountInput = $id(inputId);
    const feedback = $id(feedbackId);
    const bdtInput = bdtInputId ? $id(bdtInputId) : null;

    if (!amountInput || !feedback) return () => false;

    const handler = () => {
        const raw = amountInput.value;
        const value = parseFloat(raw);
        if (isNaN(value) || value <= 0) {
            feedback.textContent = '';
            feedback.className = 'amount-feedback';
            if (bdtInput) bdtInput.value = '';
            return false;
        }

        let ok = true;

        const usd = Number(value) || 0;
        const bdtEquivalent = usd * usdToBdt;

        // Validation
        if (usd < minUsd || (maxUsd !== null && usd > maxUsd)) {
            const limitText = maxUsd !== null
                ? `${minUsd} USD ${L.and} ${maxUsd} USD`
                : `${minUsd} USD`;

            feedback.textContent = `${L.amountMustBe} ${limitText}`;
            feedback.className = 'amount-feedback amount-invalid';
            ok = false;
        } else {

            // Show BDT conversion
            if (showBdt && usd > 0) {
                feedback.textContent =
                    `${L.equivalentInBdt}: ৳${bdtEquivalent.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
            } else {
                feedback.textContent = '';
            }

            feedback.className = 'amount-feedback amount-valid';
        }

        if (bdtInput) bdtInput.value = ok ? bdtEquivalent.toFixed(2) : '';
        return ok;
    };

    amountInput.addEventListener('input', handler);
    handler();
    return handler;
}

// ---------------- Setup validators (match your modal IDs) ----------------
const mbValidator = validateAmount('mbAmount', 'mbFeedback', 10, 200, true);
const binanceValidator = validateAmount('binanceAmount', 'binanceFeedback', 10, 500, false, 'binanceBdtAmount');

// Crypto: modal-crypto's form input, find it reliably
const modalCrypto = $id('modal-crypto');
const cryptoForm = modalCrypto ? modalCrypto.querySelector('form') : null;
const cryptoValidator = validateAmount('cryptoAmount', 'cryptoFeedback', 50, 1000, false);

// ---------------- Enable / disable Confirm buttons ----------------
function enableWhenValid(amountId, validatorFn, modalSelectorOrButton, extraFieldId = null) {
    const amountEl = $id(amountId);
    const button = typeof modalSelectorOrButton === 'string'
        ? document.querySelector(modalSelectorOrButton)
        : modalSelectorOrButton;
    const extraField = extraFieldId ? $id(extraFieldId) : null;

    if (!amountEl || !button) return;

    const sync = () => {
        const amountOK = validatorFn ? validatorFn() : true;
        const extraOK = extraField ? extraField.value.trim().length > 0 : true;
        button.disabled = !(amountOK && extraOK);
    };

    amountEl.addEventListener('input', sync);
    if (extraField) extraField.addEventListener('input', sync);

    // run once at init
    sync();
}

// Attach the button syncs
enableWhenValid('mbAmount', mbValidator, '#modal-mobile-banking button[type="submit"]', 'mbTrxId');
enableWhenValid('binanceAmount', binanceValidator, '#modal-binance button[type="submit"]', 'binanceTxnId');
enableWhenValid('cryptoAmount', cryptoValidator, '#modal-crypto button[type="submit"]');

// ---------------- Dynamic modal openers (payment cards) ----------------
document.querySelectorAll('.payment-card').forEach(card => {
    card.addEventListener('click', () => {
        // If user not logged in, show login modal
        if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
            if (loginModal) loginModal.classList.add('show');
            return;
        }

        const modalId = card.dataset.modal;
        const modal = modalId ? $id(modalId) : null;
        const provider = card.dataset.provider; // 'Bkash', 'Nagad', 'Upay'
        const currency = card.dataset.currency; // e.g., 'usdttrc20' or 'btc' (in your EJS it's lowercase)

        if (!modal) return;

        // MOBILE BANKING modal
        if (modalId === 'modal-mobile-banking' && provider) {
            // pick a random agent for this provider
            const agents = (typeof agentData !== 'undefined' && agentData[provider]) ? agentData[provider] : [];
            if (agents && agents.length) {
                const randomAgent = agents[Math.floor(Math.random() * agents.length)];
                $id('mb-agent-name').textContent = randomAgent.full_name || 'Agent';
                $id('mb-agent-number').textContent = randomAgent.contact || 'N/A';
            } else {
                $id('mb-agent-name').textContent = 'System';
                $id('mb-agent-number').textContent = 'Not available';
            }

            // set modal title and form action
            $id('mb-title').textContent = `${provider} Deposit`;
            // set action to route expected on server
            const mbForm = $id('mb-form');
            if (mbForm) {
                mbForm.action = `/deposit/${provider.toLowerCase()}`; // e.g., /deposit/bkash
            }

            // clear inputs & feedback
            if ($id('mbAmount')) $id('mbAmount').value = '';
            if ($id('mbTrxId')) $id('mbTrxId').value = '';
            if ($id('mbFeedback')) $id('mbFeedback').textContent = '';

            openModal(modal);
            // re-run input event to update button state
            const input = modal.querySelector('input[type="number"]');
            if (input) input.dispatchEvent(new Event('input'));
            return;
        }

        // BINANCE modal
        if (modalId === 'modal-binance') {
            // clear & reset
            if ($id('binanceAmount')) $id('binanceAmount').value = '';
            if ($id('binanceBdtAmount')) $id('binanceBdtAmount').value = '';
            if ($id('binanceFeedback')) $id('binanceFeedback').textContent = '';
            if ($id('binanceTxnId')) $id('binanceTxnId').value = '';

            openModal(modal);
            const input = modal.querySelector('input[type="number"]');
            if (input) input.dispatchEvent(new Event('input'));
            return;
        }

        // CRYPTO modal
        if (modalId === 'modal-crypto' && currency) {
            const currencyInput = $id('cryptoCurrency');
            const cryptoTitle = $id('cryptoTitle');
            if (currencyInput) currencyInput.value = currency;
            if (cryptoTitle) cryptoTitle.textContent = `Crypto Deposit (${currency.toUpperCase().replace('USDT', 'USDT-')})`;

            // clear & reset
            if ($id('cryptoAmount')) $id('cryptoAmount').value = '';
            if ($id('cryptoFeedback')) $id('cryptoFeedback').textContent = '';

            openModal(modal);
            const input = modal.querySelector('input[type="number"]');
            if (input) input.dispatchEvent(new Event('input'));
            return;
        }

        // Default: open modal if nothing special
        openModal(modal);
    });
});

// ---------------- Submit guards (prevent invalid submits) ----------------
function attachSubmitGuardToForm(formEl, validatorFn) {
    if (!formEl) return;
    formEl.addEventListener('submit', e => {
        const ok = validatorFn ? validatorFn() : true;
        if (!ok) {
            e.preventDefault();
            alert(L.pleaseEnterValid);
        } else {
            // let form submit naturally - server expects normal POST
            // (we do not intercept to fetch here)
        }
    });
}

// mobile-banking
attachSubmitGuardToForm($id('mb-form'), mbValidator);

// binance
attachSubmitGuardToForm($id('binanceForm'), binanceValidator);

// crypto - use form inside modal-crypto
attachSubmitGuardToForm(cryptoForm, cryptoValidator);

// ---------------- Defensive: ensure modals hidden initially ----------------
document.querySelectorAll('.modal').forEach(m => {
    if (m.style.display === '' || m.style.display === 'block') {
        // keep server-controlled display as-is; otherwise hide
        // (we won't forcibly hide server-opened modals)
    }
});

// ---------------- Done ----------------