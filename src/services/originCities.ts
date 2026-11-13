/**
 * Indian cities people usually start a trip from, with their main airport code.
 * Used to read "from <city>" and to price the right flight (never silently Bengaluru).
 */
export interface OriginCity {
  name: string;
  code: string;
  aliases: string[];
}

export const ORIGIN_CITIES: OriginCity[] = [
  { name: 'Bengaluru', code: 'BLR', aliases: ['bengaluru', 'bangalore', 'blr'] },
  { name: 'New Delhi', code: 'DEL', aliases: ['delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'ncr'] },
  { name: 'Mumbai', code: 'BOM', aliases: ['mumbai', 'bombay', 'thane', 'navi mumbai'] },
  { name: 'Chennai', code: 'MAA', aliases: ['chennai', 'madras'] },
  { name: 'Hyderabad', code: 'HYD', aliases: ['hyderabad', 'secunderabad'] },
  { name: 'Kolkata', code: 'CCU', aliases: ['kolkata', 'calcutta'] },
  { name: 'Pune', code: 'PNQ', aliases: ['pune', 'poona'] },
  { name: 'Ahmedabad', code: 'AMD', aliases: ['ahmedabad'] },
  { name: 'Kochi', code: 'COK', aliases: ['kochi', 'cochin', 'ernakulam'] },
  { name: 'Goa', code: 'GOI', aliases: ['goa'] },
  { name: 'Jaipur', code: 'JAI', aliases: ['jaipur'] },
  { name: 'Lucknow', code: 'LKO', aliases: ['lucknow'] },
  { name: 'Chandigarh', code: 'IXC', aliases: ['chandigarh', 'mohali', 'panchkula'] },
  { name: 'Indore', code: 'IDR', aliases: ['indore'] },
  { name: 'Bhopal', code: 'BHO', aliases: ['bhopal'] },
  { name: 'Nagpur', code: 'NAG', aliases: ['nagpur'] },
  { name: 'Patna', code: 'PAT', aliases: ['patna'] },
  { name: 'Bhubaneswar', code: 'BBI', aliases: ['bhubaneswar'] },
  { name: 'Guwahati', code: 'GAU', aliases: ['guwahati'] },
  { name: 'Visakhapatnam', code: 'VTZ', aliases: ['visakhapatnam', 'vizag'] },
  { name: 'Vijayawada', code: 'VGA', aliases: ['vijayawada'] },
  { name: 'Coimbatore', code: 'CJB', aliases: ['coimbatore'] },
  { name: 'Madurai', code: 'IXM', aliases: ['madurai'] },
  { name: 'Thiruvananthapuram', code: 'TRV', aliases: ['thiruvananthapuram', 'trivandrum'] },
  { name: 'Kozhikode', code: 'CCJ', aliases: ['kozhikode', 'calicut'] },
  { name: 'Mangaluru', code: 'IXE', aliases: ['mangaluru', 'mangalore'] },
  { name: 'Mysuru', code: 'MYQ', aliases: ['mysuru', 'mysore'] },
  { name: 'Surat', code: 'STV', aliases: ['surat'] },
  { name: 'Vadodara', code: 'BDQ', aliases: ['vadodara', 'baroda'] },
  { name: 'Ranchi', code: 'IXR', aliases: ['ranchi'] },
  { name: 'Raipur', code: 'RPR', aliases: ['raipur'] },
  { name: 'Dehradun', code: 'DED', aliases: ['dehradun'] },
  { name: 'Varanasi', code: 'VNS', aliases: ['varanasi', 'banaras'] },
  { name: 'Amritsar', code: 'ATQ', aliases: ['amritsar'] },
  { name: 'Srinagar', code: 'SXR', aliases: ['srinagar'] },
  { name: 'Udaipur', code: 'UDR', aliases: ['udaipur'] },
  { name: 'Tiruchirappalli', code: 'TRZ', aliases: ['trichy', 'tiruchirappalli'] }
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** City in a "from <city>" / "starting from <city>" / "leaving <city>" phrase. */
export function findOriginInText(text: string): OriginCity | null {
  const lower = (text || '').toLowerCase();
  for (const city of ORIGIN_CITIES) {
    for (const alias of city.aliases) {
      const re = new RegExp(`\\b(?:from|leaving|departing|starting\\s+from|starting\\s+in|based\\s+in|live\\s+in)\\s+${escapeRe(alias)}\\b`);
      if (re.test(lower)) return city;
    }
  }
  return null;
}

/** Airport code for an origin label like "Kolkata" or "Kolkata (CCU)"; null when unknown. */
export function originCodeFor(origin: string): string | null {
  const m = (origin || '').match(/\(([A-Z]{3})\)/);
  if (m) return m[1];
  const lower = (origin || '').toLowerCase().trim();
  const city = ORIGIN_CITIES.find((c) => c.aliases.some((a) => lower === a || lower.startsWith(a + ' ') || lower.startsWith(a + ',')));
  return city ? city.code : null;
}
