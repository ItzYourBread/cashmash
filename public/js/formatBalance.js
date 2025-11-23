function formatBalance(number) {
    const num = Number(number);
    if (isNaN(num)) return String(number);

    return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
