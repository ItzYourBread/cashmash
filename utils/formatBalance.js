function formatBalance(number) {
  // CRITICAL: Ensure the input is an actual Number type
  const num = Number(number); 
  
  if (isNaN(num)) {
    return String(number); // Return original if not a number
  }

  // 1. Handle numbers less than 1000 (show as normal number)
  if (num < 1000) {
    return num.toString();
  }
  
  // 2. Handle 1000 to 9999 (Force X.XK format to prevent "1" instead of "1K")
  if (num < 10000) {
    // toFixed(1) ensures one decimal place is always shown, e.g., 1.0K
    return (num / 1000).toFixed(1) + 'K';
  }

  // 3. Handle numbers 10,000 and above (Use robust Compact Notation)
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumSignificantDigits: 3, 
  });
  
  return formatter.format(num);
}

module.exports = formatBalance;