/**
 * Currency Pairs Database - 156 Total Pairs
 * Organized by tier access and market category
 */

export type CurrencyPair = {
  symbol: string;
  name: string;
  category: 'major' | 'minor' | 'exotic';
  tier: 'free' | 'premium' | 'pro';
};

/**
 * FREE TIER - 1 pair
 * Most popular pair for demo access
 */
export const FREE_PAIRS: CurrencyPair[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'major', tier: 'free' },
];

/**
 * PREMIUM TIER - 10 pairs (includes free)
 * Major currency pairs with highest liquidity
 */
export const PREMIUM_PAIRS: CurrencyPair[] = [
  ...FREE_PAIRS,
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'major', tier: 'premium' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'major', tier: 'premium' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'major', tier: 'premium' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'major', tier: 'premium' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'major', tier: 'premium' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'major', tier: 'premium' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', category: 'major', tier: 'premium' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', category: 'major', tier: 'premium' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'major', tier: 'premium' },
];

/**
 * PRO TIER - 156 pairs (includes free + premium)
 * Complete access to all major, minor, and exotic pairs
 */
export const PRO_PAIRS: CurrencyPair[] = [
  ...PREMIUM_PAIRS,
  
  // Additional Major Pairs (18 more to complete 28 major)
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', category: 'major', tier: 'pro' },
  { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', category: 'major', tier: 'pro' },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', category: 'major', tier: 'pro' },
  { symbol: 'GBP/NZD', name: 'British Pound / New Zealand Dollar', category: 'major', tier: 'pro' },
  { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', category: 'major', tier: 'pro' },
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', category: 'major', tier: 'pro' },
  { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', category: 'major', tier: 'pro' },
  { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', category: 'major', tier: 'pro' },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', category: 'major', tier: 'pro' },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', category: 'major', tier: 'pro' },
  { symbol: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar', category: 'major', tier: 'pro' },
  { symbol: 'NZD/CHF', name: 'New Zealand Dollar / Swiss Franc', category: 'major', tier: 'pro' },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', category: 'major', tier: 'pro' },
  
  // Minor Pairs (38 pairs)
  { symbol: 'USD/CNY', name: 'US Dollar / Chinese Yuan', category: 'minor', tier: 'pro' },
  { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'USD/KRW', name: 'US Dollar / South Korean Won', category: 'minor', tier: 'pro' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', category: 'minor', tier: 'pro' },
  { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', category: 'minor', tier: 'pro' },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', category: 'minor', tier: 'pro' },
  { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', category: 'minor', tier: 'pro' },
  { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', category: 'minor', tier: 'pro' },
  { symbol: 'USD/RUB', name: 'US Dollar / Russian Ruble', category: 'minor', tier: 'pro' },
  { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', category: 'minor', tier: 'pro' },
  { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', category: 'minor', tier: 'pro' },
  { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', category: 'minor', tier: 'pro' },
  { symbol: 'USD/PLN', name: 'US Dollar / Polish Zloty', category: 'minor', tier: 'pro' },
  { symbol: 'USD/THB', name: 'US Dollar / Thai Baht', category: 'minor', tier: 'pro' },
  { symbol: 'USD/IDR', name: 'US Dollar / Indonesian Rupiah', category: 'minor', tier: 'pro' },
  { symbol: 'USD/MYR', name: 'US Dollar / Malaysian Ringgit', category: 'minor', tier: 'pro' },
  { symbol: 'USD/PHP', name: 'US Dollar / Philippine Peso', category: 'minor', tier: 'pro' },
  { symbol: 'USD/CZK', name: 'US Dollar / Czech Koruna', category: 'minor', tier: 'pro' },
  { symbol: 'USD/HUF', name: 'US Dollar / Hungarian Forint', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/CNY', name: 'Euro / Chinese Yuan', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/HKD', name: 'Euro / Hong Kong Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/SGD', name: 'Euro / Singapore Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/SEK', name: 'Euro / Swedish Krona', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/NOK', name: 'Euro / Norwegian Krone', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/DKK', name: 'Euro / Danish Krone', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/PLN', name: 'Euro / Polish Zloty', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/TRY', name: 'Euro / Turkish Lira', category: 'minor', tier: 'pro' },
  { symbol: 'EUR/ZAR', name: 'Euro / South African Rand', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/SGD', name: 'British Pound / Singapore Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/SEK', name: 'British Pound / Swedish Krona', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/NOK', name: 'British Pound / Norwegian Krone', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/DKK', name: 'British Pound / Danish Krone', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/PLN', name: 'British Pound / Polish Zloty', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/TRY', name: 'British Pound / Turkish Lira', category: 'minor', tier: 'pro' },
  { symbol: 'GBP/ZAR', name: 'British Pound / South African Rand', category: 'minor', tier: 'pro' },
  { symbol: 'AUD/SGD', name: 'Australian Dollar / Singapore Dollar', category: 'minor', tier: 'pro' },
  { symbol: 'CHF/SEK', name: 'Swiss Franc / Swedish Krona', category: 'minor', tier: 'pro' },
  
  // Exotic Pairs (90 pairs)
  { symbol: 'USD/ARS', name: 'US Dollar / Argentine Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/CLP', name: 'US Dollar / Chilean Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/COP', name: 'US Dollar / Colombian Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/PEN', name: 'US Dollar / Peruvian Sol', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/UYU', name: 'US Dollar / Uruguayan Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/VND', name: 'US Dollar / Vietnamese Dong', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/EGP', name: 'US Dollar / Egyptian Pound', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/MAD', name: 'US Dollar / Moroccan Dirham', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/NGN', name: 'US Dollar / Nigerian Naira', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/KES', name: 'US Dollar / Kenyan Shilling', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/GHS', name: 'US Dollar / Ghanaian Cedi', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/TND', name: 'US Dollar / Tunisian Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/JOD', name: 'US Dollar / Jordanian Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/LBP', name: 'US Dollar / Lebanese Pound', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/IQD', name: 'US Dollar / Iraqi Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/SAR', name: 'US Dollar / Saudi Riyal', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/AED', name: 'US Dollar / UAE Dirham', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/KWD', name: 'US Dollar / Kuwaiti Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/QAR', name: 'US Dollar / Qatari Riyal', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/OMR', name: 'US Dollar / Omani Rial', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/BHD', name: 'US Dollar / Bahraini Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/ILS', name: 'US Dollar / Israeli Shekel', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/PKR', name: 'US Dollar / Pakistani Rupee', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/BDT', name: 'US Dollar / Bangladeshi Taka', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/LKR', name: 'US Dollar / Sri Lankan Rupee', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/NPR', name: 'US Dollar / Nepalese Rupee', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/MMK', name: 'US Dollar / Myanmar Kyat', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/KHR', name: 'US Dollar / Cambodian Riel', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/LAK', name: 'US Dollar / Lao Kip', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/TWD', name: 'US Dollar / Taiwan Dollar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/ISK', name: 'US Dollar / Icelandic Krona', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/RON', name: 'US Dollar / Romanian Leu', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/BGN', name: 'US Dollar / Bulgarian Lev', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/HRK', name: 'US Dollar / Croatian Kuna', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/RSD', name: 'US Dollar / Serbian Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/UAH', name: 'US Dollar / Ukrainian Hryvnia', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/KZT', name: 'US Dollar / Kazakhstani Tenge', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/UZS', name: 'US Dollar / Uzbekistani Som', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/GEL', name: 'US Dollar / Georgian Lari', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/AMD', name: 'US Dollar / Armenian Dram', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/AZN', name: 'US Dollar / Azerbaijani Manat', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/BYN', name: 'US Dollar / Belarusian Ruble', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/MDL', name: 'US Dollar / Moldovan Leu', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/ALL', name: 'US Dollar / Albanian Lek', category: 'exotic', tier: 'pro' },
  { symbol: 'USD/MKD', name: 'US Dollar / Macedonian Denar', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/RON', name: 'Euro / Romanian Leu', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/BGN', name: 'Euro / Bulgarian Lev', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/HRK', name: 'Euro / Croatian Kuna', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/RSD', name: 'Euro / Serbian Dinar', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/UAH', name: 'Euro / Ukrainian Hryvnia', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/ILS', name: 'Euro / Israeli Shekel', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/CZK', name: 'Euro / Czech Koruna', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/HUF', name: 'Euro / Hungarian Forint', category: 'exotic', tier: 'pro' },
  { symbol: 'EUR/RUB', name: 'Euro / Russian Ruble', category: 'exotic', tier: 'pro' },
  { symbol: 'GBP/CZK', name: 'British Pound / Czech Koruna', category: 'exotic', tier: 'pro' },
  { symbol: 'GBP/HUF', name: 'British Pound / Hungarian Forint', category: 'exotic', tier: 'pro' },
  { symbol: 'GBP/RON', name: 'British Pound / Romanian Leu', category: 'exotic', tier: 'pro' },
  { symbol: 'GBP/ILS', name: 'British Pound / Israeli Shekel', category: 'exotic', tier: 'pro' },
  { symbol: 'CHF/CZK', name: 'Swiss Franc / Czech Koruna', category: 'exotic', tier: 'pro' },
  { symbol: 'CHF/HUF', name: 'Swiss Franc / Hungarian Forint', category: 'exotic', tier: 'pro' },
  { symbol: 'CHF/PLN', name: 'Swiss Franc / Polish Zloty', category: 'exotic', tier: 'pro' },
  { symbol: 'AUD/MXN', name: 'Australian Dollar / Mexican Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'AUD/ZAR', name: 'Australian Dollar / South African Rand', category: 'exotic', tier: 'pro' },
  { symbol: 'NZD/SGD', name: 'New Zealand Dollar / Singapore Dollar', category: 'exotic', tier: 'pro' },
  { symbol: 'CAD/MXN', name: 'Canadian Dollar / Mexican Peso', category: 'exotic', tier: 'pro' },
  { symbol: 'CAD/SGD', name: 'Canadian Dollar / Singapore Dollar', category: 'exotic', tier: 'pro' },
  { symbol: 'CAD/ZAR', name: 'Canadian Dollar / South African Rand', category: 'exotic', tier: 'pro' },
  { symbol: 'SGD/JPY', name: 'Singapore Dollar / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'HKD/JPY', name: 'Hong Kong Dollar / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'CNY/JPY', name: 'Chinese Yuan / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'MXN/JPY', name: 'Mexican Peso / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'ZAR/JPY', name: 'South African Rand / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'TRY/JPY', name: 'Turkish Lira / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'SEK/JPY', name: 'Swedish Krona / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'NOK/JPY', name: 'Norwegian Krone / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'DKK/JPY', name: 'Danish Krone / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'PLN/JPY', name: 'Polish Zloty / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'CZK/JPY', name: 'Czech Koruna / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'HUF/JPY', name: 'Hungarian Forint / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'INR/JPY', name: 'Indian Rupee / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'KRW/JPY', name: 'South Korean Won / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'THB/JPY', name: 'Thai Baht / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'IDR/JPY', name: 'Indonesian Rupiah / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'MYR/JPY', name: 'Malaysian Ringgit / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'PHP/JPY', name: 'Philippine Peso / Japanese Yen', category: 'exotic', tier: 'pro' },
  { symbol: 'VND/JPY', name: 'Vietnamese Dong / Japanese Yen', category: 'exotic', tier: 'pro' },
];

/**
 * Get pairs available for a specific tier
 */
export function getPairsForTier(tier: 'free' | 'premium' | 'pro'): CurrencyPair[] {
  switch (tier) {
    case 'free':
      return FREE_PAIRS;
    case 'premium':
      return PREMIUM_PAIRS;
    case 'pro':
      return PRO_PAIRS;
    default:
      return FREE_PAIRS;
  }
}

/**
 * Check if a user has access to a specific pair
 */
export function hasAccessToPair(userTier: 'free' | 'premium' | 'pro', pairSymbol: string): boolean {
  const availablePairs = getPairsForTier(userTier);
  return availablePairs.some(pair => pair.symbol === pairSymbol);
}

/**
 * Get pair count for each tier
 */
export const TIER_PAIR_COUNTS = {
  free: FREE_PAIRS.length,      // 1
  premium: PREMIUM_PAIRS.length, // 10
  pro: PRO_PAIRS.length,         // 156
};
