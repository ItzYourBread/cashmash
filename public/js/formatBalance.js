// This is the content you need to copy from your /utils/formatBalance.js
function formatBalance(number) {
    const num = Number(number); 
    if (isNaN(num)) return String(number);
    
    if (num < 1000) {
        return num.toString();
    }

    if (num < 10000) {
        let formatted = (Math.round(num / 100) / 10).toString(); 
        
        if (formatted.endsWith('.0')) {
             formatted = formatted.slice(0, -2);
        }
        return formatted + 'K';
    }

    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumSignificantDigits: 3, 
    });
    
    return formatter.format(num);
}