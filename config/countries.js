// Add this definition to your Mongoose schema file if you want to use Enum:
const COUNTRY_CODES = [
    // Popular
    'US', 'CA', 'GB', 'AU', 'IN', 'BD', 'DE', 'BR',
    // Europe
    'FR', 'ES', 'IT', 'PL', 'NL', 'SE', 'CH', 'IE', 'GR',
    // North & South America
    'MX', 'AR', 'CO', 'PE', 'CL', 'EC',
    // Asia & Oceania
    'CN', 'JP', 'KR', 'ID', 'PK', 'PH', 'VN', 'NZ',
    // Africa & Middle East
    'NG', 'ZA', 'EG', 'SA', 'TR',
];


module.exports = {
    COUNTRY_CODES
};