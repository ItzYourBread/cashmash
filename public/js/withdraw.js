// Elements
const withdrawSelect = document.getElementById('withdrawMethodSelect');
const walletFormWrap = document.getElementById('walletFormWrap');
const binanceFormWrap = document.getElementById('binanceFormWrap');

const walletForm = document.getElementById('walletForm');
const walletConfirmBtn = document.getElementById('walletConfirmBtn');
const walletAmountInput = document.getElementById('walletAmount');
const walletFeedback = document.getElementById('walletFeedback');

const binanceForm = binanceFormWrap.querySelector('form');
const binanceConfirmBtn = document.getElementById('binanceConfirmBtn');
const binanceAmountInput = document.getElementById('binanceAmount');
const binanceFeedback = document.getElementById('binanceFeedback');

// Hide all forms initially
function hideAllForms() {
    walletFormWrap.classList.add('hidden');
    binanceFormWrap.classList.add('hidden');
    walletConfirmBtn.disabled = true;
    binanceConfirmBtn.disabled = true;
}

hideAllForms();

// On method select
withdrawSelect.addEventListener('change', () => {
    hideAllForms();
    const method = withdrawSelect.value;

    if (method === 'bkash' || method === 'nagad' || method === 'upay') {
        walletFormWrap.classList.remove('hidden');
        document.getElementById('walletTitle').textContent =
            method.charAt(0).toUpperCase() + method.slice(1).toLowerCase() + ' Withdraw';
        walletForm.dataset.method = method; // store method for submission
    } else if (method === 'binance') {
        binanceFormWrap.classList.remove('hidden');
    }
});

// Enable/disable confirm button based on amount
function validateAmount(input, btn, feedback, minAmount = 10) {
    input.addEventListener('input', () => {
        const value = parseFloat(input.value);
        if (!value || value < minAmount) {
            btn.disabled = true;
            feedback.textContent = `Minimum amount is $${minAmount}`;
            feedback.style.color = 'red';
        } else {
            btn.disabled = false;
            feedback.textContent = '';
        }
    });
}

validateAmount(walletAmountInput, walletConfirmBtn, walletFeedback, 10);
validateAmount(binanceAmountInput, binanceConfirmBtn, binanceFeedback, 10);

// Wallet Form Submission
walletForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const method = walletForm.dataset.method || withdrawSelect.value; // fallback
    if (!method) return alert('Please select a method');

    const data = {
        fullName: walletForm.fullName.value,
        contact: walletForm.contact.value,
        amount: parseFloat(walletForm.amount.value),
    };

    try {
        const res = await fetch(`/withdraw/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.redirected) {
            window.location.href = res.url;
        } else {
            const result = await res.json();
            alert(result.message || 'Withdrawal submitted!');
        }
    } catch (err) {
        alert('Error submitting withdrawal.');
        console.error(err);
    }
});


// Binance Form Submission
binanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        userIdOrEmail: binanceForm.userIdOrEmail.value,
        amount: parseFloat(binanceForm.amount.value),
    };

    try {
        const res = await fetch('/withdraw/binance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.redirected) {
            window.location.href = res.url;
        } else {
            const result = await res.json();
            alert(result.message || 'Withdrawal submitted!');
        }
    } catch (err) {
        alert('Error submitting withdrawal.');
        console.error(err);
    }
});