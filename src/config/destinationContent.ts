/**
 * AeroDAG — Central Destination Content Configuration
 * 
 * Central source of truth for destination-specific content across:
 * - Goa
 * - Coorg
 * - Kerala (Munnar / Alleppey)
 * - Mysuru
 * 
 * Ensures non-Goa trips never display beach or Dabolim text,
 * travel times are honest and realistic (labeled "approx."),
 * and no fictitious high-speed rail claims exist.
 */

export interface DestinationContent {
  key: 'goa' | 'coorg' | 'kerala' | 'mysuru' | 'other';
  name: string;
  airportOrRouteAdvisory: string;
  diningHighlight: string;
  nearbySight: string;
  nearbyDining: string;
  clarifyStretchNote: string;
  hiddenCostWarnings: string[];
  routeComparison: {
    recommendedMode: 'Flight' | 'Train' | 'Road';
    sensoryHighlights: string[];
    options: Array<{
      mode: 'Flight' | 'Train' | 'Bus' | 'Road';
      title: string;
      duration: string;
      costPerPersonINR: number;
      timeSavedText: string;
      scenicHighlight: string;
      scenicScore?: number;
      tradeOffNote: string;
      isRecommended?: boolean;
    }>;
  };
}

export const DESTINATION_CONTENT: Record<string, DestinationContent> = {
  goa: {
    key: 'goa',
    name: 'Goa',
    airportOrRouteAdvisory: 'Fly into Dabolim (GOI) for South Goa or Manohar Mopa (GOX) for North Goa.',
    diningHighlight: 'Beach shacks, fresh coastal seafood, roadside poi bread, and evening cafe snacks.',
    nearbySight: 'Beach & Coastal Promenade',
    nearbyDining: 'Local Coastal & Seafood Bistro',
    clarifyStretchNote: 'prime beachfront or sea-view resort',
    hiddenCostWarnings: [
      'Remote Airport Transfer: Manohar Mopa Airport (GOX) is approx. 55 km from South Goa; pre-paid taxis cost ₹2,200–₹2,500.',
      'App-Cab Restrictions: Ola and Uber are restricted by local taxi unions; pre-book private cabs or use GoaMiles.',
      'Driver Night Surcharge: Cabs typically charge a ₹400–₹500 driver allowance for trips after 9:30 PM.'
    ],
    routeComparison: {
      recommendedMode: 'Flight',
      sensoryHighlights: [
        'Coastal flight banking approach over Arabian Sea waters into Goa',
        'Dudhsagar Waterfall spray on Vasco Express rail carriages',
        'Winding Western Ghats highway through Chorla mountain pass'
      ],
      options: [
        {
          mode: 'Flight',
          title: 'Direct Scheduled Flight (BLR ↔ GOI/GOX)',
          duration: 'approx. 1h 15m',
          costPerPersonINR: 3500,
          timeSavedText: 'Saves approx. 12h vs train',
          scenicHighlight: 'Coastal aerial approach over estuaries and palm-lined beaches.',
          tradeOffNote: 'Fastest journey — unlocks half-day beach exploration on Day 1.',
          isRecommended: true
        },
        {
          mode: 'Train',
          title: 'Yesvantpur – Vasco da Gama Express (2A AC Sleeper)',
          duration: 'approx. 14 hours',
          costPerPersonINR: 1680,
          timeSavedText: 'Overnight transit (saves 1 hotel night)',
          scenicHighlight: 'Scenic Western Ghats rail bridge crossing Dudhsagar waterfalls.',
          tradeOffNote: 'Overnight rail journey. Relaxed pace with confirmed berths.'
        },
        {
          mode: 'Road',
          title: 'Private Chauffeured AC Cab (Door-to-Door)',
          duration: 'approx. 11–12 hours',
          costPerPersonINR: 3100,
          timeSavedText: 'Flexible departure',
          scenicHighlight: 'Western Ghats mountain roads and highway spice plantation stops.',
          tradeOffNote: 'Full flexibility for family stops. Long 11+ hour driving day.'
        }
      ]
    }
  },

  coorg: {
    key: 'coorg',
    name: 'Coorg',
    airportOrRouteAdvisory: 'Coorg is reached by a scenic road drive from Bengaluru (approx. 5.5 hours); there is no commercial airport in Coorg.',
    diningHighlight: 'Traditional Kodava pandi/veg curry, akki rotti, plantation tea, and estate honey.',
    nearbySight: 'Coffee Plantation Trails & Mountain Viewpoint',
    nearbyDining: 'Authentic Kodava Kitchen & Homestyle Diner',
    clarifyStretchNote: 'scenic coffee estate cottage or luxury plantation resort',
    hiddenCostWarnings: [
      'Ghat Road Night Driving: Hill roads around Madikeri become foggy after 7:00 PM; plan arrival before sunset.',
      'Local Outstation Cab Rates: Local sightseeing taxis often charge a standard 250 km/day minimum package rate.',
      'Remote Homestay Access: Homestays located deep inside coffee plantations may have unpaved approach roads.'
    ],
    routeComparison: {
      recommendedMode: 'Road',
      sensoryHighlights: [
        'Fragrant coffee plantations, pepper vines, and rolling green hills of Kodagu',
        'Highway stop for famous Channapatna wooden crafts and traditional South Indian filter coffee'
      ],
      options: [
        {
          mode: 'Road',
          title: 'Private Chauffeured AC Cab (Bengaluru ↔ Coorg)',
          duration: 'approx. 5.5 hours',
          costPerPersonINR: 2200,
          timeSavedText: 'Direct door-to-door transit',
          scenicHighlight: 'Lush Western Ghats ascent with scenic coffee estate highway stretches.',
          tradeOffNote: 'Most convenient mode for families with zero luggage handling hassles.',
          isRecommended: true
        },
        {
          mode: 'Train',
          title: 'Vande Bharat / Express to Mysuru + Connecting Cab',
          duration: 'approx. 2h rail + approx. 2.5h road',
          costPerPersonINR: 1650,
          timeSavedText: 'Smooth rail leg',
          scenicHighlight: 'Comfortable rail journey to Mysuru followed by ghat drive to Madikeri.',
          tradeOffNote: 'Economical alternative; requires changing from train to taxi at Mysuru station.'
        }
      ]
    }
  },

  kerala: {
    key: 'kerala',
    name: 'Kerala',
    airportOrRouteAdvisory: 'Fly into Cochin Airport (COK); Munnar is approx. 3.5–4 hours scenic ghat drive from Kochi.',
    diningHighlight: 'Appam with vegetable stew, Malabar parotta, banana chips, and fresh tender coconut water.',
    nearbySight: 'Tea Garden Trails & Scenic Lake Promenade',
    nearbyDining: 'Traditional Kerala Banana Leaf Diner',
    clarifyStretchNote: 'panoramic tea valley resort or private backwater houseboat',
    hiddenCostWarnings: [
      'Winding Mountain Ghats: The 130 km mountain road from Kochi to Munnar takes approx. 3.5–4 hours due to hairpin bends.',
      'Houseboat Air-Conditioning: Standard backwater houseboats run AC in bedrooms only from 9:00 PM to 6:00 AM.',
      'Speed Camera Enforcement: Strict 60–70 km/h speed limits with automated camera traps along Kerala state highways.'
    ],
    routeComparison: {
      recommendedMode: 'Flight',
      sensoryHighlights: [
        'Misty tea carpets rolling across Munnar valleys and calm canal backwaters in Alleppey',
        'Lush spice gardens with fresh cardamom, cinnamon, and pepper aromas'
      ],
      options: [
        {
          mode: 'Flight',
          title: 'Flight to Kochi (COK) + Scenic Mountain Cab',
          duration: 'approx. 1h 15m flight + approx. 3.5h drive',
          costPerPersonINR: 4200,
          timeSavedText: 'Saves approx. 6 hours vs direct road',
          scenicHighlight: 'Cheeyappara and Valara waterfall viewpoints along the Munnar hill highway.',
          tradeOffNote: 'Recommended balance of fast travel and scenic hill ascent.',
          isRecommended: true
        },
        {
          mode: 'Train',
          title: 'Overnight Express Rail to Aluva (AWY) + Connecting Cab',
          duration: 'approx. 9h train + approx. 3.5h drive',
          costPerPersonINR: 1950,
          timeSavedText: 'Overnight journey (saves 1 hotel night)',
          scenicHighlight: 'Wake up to lush green coconut groves and palm-lined Kerala canals.',
          tradeOffNote: 'Economical family option. Requires morning taxi pickup from Aluva.'
        },
        {
          mode: 'Road',
          title: 'Direct Highway Drive (Bengaluru ↔ Munnar)',
          duration: 'approx. 10–11 hours',
          costPerPersonINR: 2800,
          timeSavedText: 'Door-to-door flexibility',
          scenicHighlight: 'Scenic drive through Salem, Dindigul, and the picturesque Theni ghat pass.',
          tradeOffNote: 'Long 10+ hour drive across states; recommended with an overnight rest stop.'
        }
      ]
    }
  },

  mysuru: {
    key: 'mysuru',
    name: 'Mysuru',
    airportOrRouteAdvisory: 'Mysuru is reached in approx. 2 hours by Vande Bharat / Shatabdi train or Expressway from Bengaluru.',
    diningHighlight: 'Mysore masala dosa, authentic hot Mysore Pak, and traditional South Indian filter coffee.',
    nearbySight: 'Palace Heritage Promenade & Devaraja Market',
    nearbyDining: 'Traditional South Indian Thali Diner',
    clarifyStretchNote: 'heritage palace-view room or luxury spa hotel',
    hiddenCostWarnings: [
      'Weekend Palace Crowds: The Mysore Palace illumination on Sunday evenings attracts heavy local traffic.',
      'Expressway Restrictions: The 10-lane expressway is restricted to 4-wheelers and buses; two-wheelers are prohibited.',
      'Monument Timings: Chamundi Hills, Jaganmohan Palace, and Brindavan Gardens have strict daytime visiting hours.'
    ],
    routeComparison: {
      recommendedMode: 'Train',
      sensoryHighlights: [
        'Majestic golden illumination of Mysore Palace on weekend evenings',
        'Fragrant sandalwood, incense, and rose garlands in Devaraja market'
      ],
      options: [
        {
          mode: 'Train',
          title: 'Vande Bharat / Shatabdi Express Rail (SBC ↔ MYS)',
          duration: 'approx. 1h 45m – 2 hours',
          costPerPersonINR: 650,
          timeSavedText: 'Fastest transit · zero traffic',
          scenicHighlight: 'Smooth express train journey through Mandya and Srirangapatna countryside.',
          tradeOffNote: 'Fastest, punctual, and highly comfortable mode with AC chair cars.',
          isRecommended: true
        },
        {
          mode: 'Road',
          title: 'Chauffeured Cab via Bengaluru-Mysuru Expressway',
          duration: 'approx. 2.5–3 hours',
          costPerPersonINR: 1200,
          timeSavedText: 'Door-to-door convenience',
          scenicHighlight: 'Modern 10-lane expressway with stops for Maddur Vada and local snacks.',
          tradeOffNote: 'Direct pickup from home. Weekend toll plaza delays may occur.'
        }
      ]
    }
  }
};

export function getDestinationContent(destination?: string): DestinationContent {
  const dest = (destination || '').toLowerCase();
  if (dest.includes('goa')) return DESTINATION_CONTENT.goa;
  if (dest.includes('coorg') || dest.includes('madikeri') || dest.includes('kodagu')) return DESTINATION_CONTENT.coorg;
  if (dest.includes('kerala') || dest.includes('munnar') || dest.includes('alleppey') || dest.includes('kochi') || dest.includes('wayanad')) return DESTINATION_CONTENT.kerala;
  if (dest.includes('mysuru') || dest.includes('mysore')) return DESTINATION_CONTENT.mysuru;

  // Generic fallback for other locations
  return {
    key: 'other',
    name: destination || 'Your destination',
    airportOrRouteAdvisory: `Direct arrival into ${destination || 'destination'} with pre-arranged local transport.`,
    diningHighlight: 'Authentic regional dishes, local tea stalls, and neighborhood family cafes.',
    nearbySight: 'Central Promenade & Historic Town Center',
    nearbyDining: 'Local Family Restaurant',
    clarifyStretchNote: 'upgraded central boutique stay',
    hiddenCostWarnings: [
      'Local Transit Buffer: Account for on-ground auto-rickshaws, parking tickets, and local toll plazas.',
      'Peak Surcharges: Weekend evening cab surcharges may apply during local festival periods.'
    ],
    routeComparison: {
      recommendedMode: 'Road',
      sensoryHighlights: ['Scenic regional highways and authentic local roadside dining'],
      options: [
        {
          mode: 'Road',
          title: 'Chauffeured Outstation Cab (Door-to-Door)',
          duration: 'approx. 4–5 hours',
          costPerPersonINR: 1800,
          timeSavedText: 'Direct transit',
          scenicHighlight: 'Highway drive with stops at local culinary viewpoints.',
          tradeOffNote: 'Flexible and convenient door-to-door transit.',
          isRecommended: true
        }
      ]
    }
  };
}
