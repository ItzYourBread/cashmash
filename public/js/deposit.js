// public/js/deposit.js
// ==================== Deposit.js (clean, production-ready) ====================

(function () {
  'use strict';

  const L = {
    amountMustBe: 'Amount must be between',
    and: 'and',
    equivalentInBdt: 'Equivalent in BDT',
    pleaseEnterValid: 'Please enter a valid amount',
    conversionError: 'Conversion resulted in too low BDT amount',
  };

  // -------- safe globals (provided by EJS) ----------
  // agentData: object keyed by provider, e.g., { Bkash: [...], Nagad: [...], Upay: [...] }
  // usedReferralCode: string or ''
  // userCountry, isLoggedIn, _usdToBdt
  // If any of these are not present, use safe defaults
  const _agentData = (typeof agentData !== 'undefined' && agentData) ? agentData : {};
  const _usedReferralCode = (typeof usedReferralCode !== 'undefined') ? (usedReferralCode || '') : '';
  const _userCountry = (typeof userCountry !== 'undefined') ? userCountry : '';
  const _isLoggedIn = (typeof isLoggedIn !== 'undefined') ? !!isLoggedIn : false;
  const _usdToBdt = (typeof usdToBdt !== 'undefined') ? Number(usdToBdt) || 1 : 1;

  // --- Utility: safe element getters ---
  const $ = selector => document.querySelector(selector);
  const $id = id => document.getElementById(id);

  // --- Tabs (left sidebar) ---
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
  const loginModal = $id('loginModal');
  const closeLoginModal = $id('closeLoginModal');

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

  // --- COUNTRY FILTER (client-side safety) ---
  try {
    if (_userCountry) {
      const bdOnly = ['Bkash', 'Nagad', 'Upay'];
      document.querySelectorAll('.payment-card').forEach(card => {
        const provider = card.dataset.provider;
        if (provider && bdOnly.includes(provider) && _userCountry !== 'BD') {
          card.style.display = 'none';
        }
      });
    }
  } catch (err) {
    // no-op if userCountry undefined
  }

  // ---------------- Amount validator ----------------
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
      const bdtEquivalent = usd * _usdToBdt;

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

  // ---------------- Helper: agent selection with referral filtering ----------------
  function getProviderAgents(provider) {
    if (!provider) return [];
    const raw = Array.isArray(_agentData[provider]) ? _agentData[provider] : [];
    // normalize: ensure agent objects have useful properties
    return raw.filter(a => a && (a.contact || a.full_name || a.Name || a.Number));
  }

  function filterAgentsByReferral(agents, referralCode) {
    if (!referralCode) return agents.slice();
    // Refs property may be uppercase or lowercase; be defensive
    return agents.filter(agent => {
      const refs = agent.Refs || agent.refs || [];
      return Array.isArray(refs) && refs.includes(referralCode);
    });
  }

  function pickAgentForProvider(provider) {
    const allAgents = getProviderAgents(provider);
    if (!allAgents.length) return null;

    // If user was referred, narrow agents
    if (_usedReferralCode) {
      const matched = filterAgentsByReferral(allAgents, _usedReferralCode);
      if (matched.length > 0) {
        return matched[Math.floor(Math.random() * matched.length)];
      }
      // else fall through to choose from allAgents
    }

    // default: pick random from all
    return allAgents[Math.floor(Math.random() * allAgents.length)];
  }

  function renderMobileBankingAgent(agent) {
    const nameEl = $id('mb-agent-name');
    const numberEl = $id('mb-agent-number');

    if (!nameEl || !numberEl) return;

    if (!agent) {
      nameEl.textContent = 'System';
      numberEl.textContent = 'Not available';
      return;
    }

    // Agent object may use different keys; be flexible
    const name = agent.full_name || agent.fullName || agent.Name || agent.name || 'Agent';
    const contact = agent.contact || agent.contact_number || agent.Number || agent.number || 'N/A';

    nameEl.textContent = name;
    numberEl.textContent = contact;
  }

  // ---------------- Dynamic modal openers (payment cards) ----------------
  document.querySelectorAll('.payment-card').forEach(card => {
    card.addEventListener('click', () => {
      // If user not logged in, show login modal
      if (typeof _isLoggedIn !== 'undefined' && !_isLoggedIn) {
        if (loginModal) loginModal.classList.add('show');
        return;
      }

      const modalId = card.dataset.modal;
      const modal = modalId ? $id(modalId) : null;
      const provider = card.dataset.provider; // 'Bkash', 'Nagad', 'Upay'
      const currency = card.dataset.currency; // e.g., 'usdttrc20' or 'btc'

      if (!modal) return;

      // MOBILE BANKING modal
      if (modalId === 'modal-mobile-banking' && provider) {

        // choose agent based on referral logic
        const agent = pickAgentForProvider(provider);

        if (agent) {
          renderMobileBankingAgent(agent);
        } else {
          // fallback display
          renderMobileBankingAgent(null);
        }

        // set modal title and form action
        $id('mb-title').textContent = `${provider} Deposit`;
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
    }
  });

  // ---------------- Done ----------------
})();
