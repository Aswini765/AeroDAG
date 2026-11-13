/**
 * Real multi-stop routes for Indian states/regions.
 * Every region AeroDAG treats as "multi-base" must have routes here (Rajasthan and Kerala
 * have hand-written routes in regionRoutesService). Base names match INDIA_PLACES so
 * airports and sights resolve from the same reference.
 */

export interface RouteBaseSpec {
  place: string;
  area: string;
  share: number; // fraction of the nights spent here
  highlight: string;
  pricePerNightINR: number;
}

export interface RouteSpec {
  id: string;
  title: string;
  tagline: string;
  bases: RouteBaseSpec[];
  travelHours: number;
  travelText: string;
  highlights: string[];
  offbeat?: boolean;
}

/** Region key -> words people type for it (matched on the whole name or as its first words). */
export const REGION_ALIASES: Record<string, string[]> = {
  rajasthan: ['rajasthan'],
  kerala: ['kerala'],
  himachal: ['himachal', 'himachal pradesh'],
  uttarakhand: ['uttarakhand', 'uttaranchal'],
  kashmir: ['kashmir', 'jammu and kashmir', 'jammu & kashmir'],
  ladakh: ['ladakh'],
  sikkim: ['sikkim'],
  meghalaya: ['meghalaya'],
  northeast: ['northeast', 'north east', 'north-east', 'north eastern india', 'seven sisters'],
  tamilnadu: ['tamil nadu', 'tamilnadu'],
  karnataka: ['karnataka'],
  gujarat: ['gujarat'],
  madhyapradesh: ['madhya pradesh'],
  odisha: ['odisha', 'orissa'],
  arunachal: ['arunachal', 'arunachal pradesh'],
  assam: ['assam']
};

export function regionKeyFor(destination?: string | null): string | null {
  if (!destination) return null;
  const lower = destination.toLowerCase().replace(/,\s*india$/, '').replace(/\s+/g, ' ').trim();
  for (const [key, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((a) => lower === a || lower.startsWith(a + ' ') || lower === `${a} state`)) return key;
  }
  return null;
}

export const REGION_ROUTES: Record<string, RouteSpec[]> = {
  himachal: [
    { id: 'hp-manali-kasol', title: 'Manali + Kasol', tagline: 'Snow views, old-village walks and the Parvati riverside', bases: [
      { place: 'Manali', area: 'Old Manali', share: 0.6, highlight: 'Solang Valley, Hadimba Temple, Old Manali cafés', pricePerNightINR: 3200 },
      { place: 'Kasol', area: 'Kasol riverside', share: 0.4, highlight: 'Parvati river, Chalal and Manikaran', pricePerNightINR: 2200 }
    ], travelHours: 2.5, travelText: 'about 2.5 h drive Manali → Kasol', highlights: ['Mountains', 'Riverside stays', 'Easy drives'], offbeat: true },
    { id: 'hp-shimla-manali', title: 'Shimla + Manali', tagline: 'The classic: colonial hill town, then the high valley', bases: [
      { place: 'Shimla', area: 'Mall Road', share: 0.4, highlight: 'The Ridge, Jakhu Temple, Kufri', pricePerNightINR: 3000 },
      { place: 'Manali', area: 'Mall Road', share: 0.6, highlight: 'Solang Valley, Hadimba Temple', pricePerNightINR: 3200 }
    ], travelHours: 7, travelText: 'about 7 h scenic drive Shimla → Manali', highlights: ['Classic route', 'Toy train option', 'Snow (Dec–Feb)'] }
  ],
  uttarakhand: [
    { id: 'uk-rishikesh-mussoorie', title: 'Rishikesh + Mussoorie', tagline: 'Ganga aarti and rafting, then cool hill walks', bases: [
      { place: 'Rishikesh', area: 'Tapovan', share: 0.5, highlight: 'Ganga Aarti, Laxman Jhula, rafting', pricePerNightINR: 2400 },
      { place: 'Mussoorie', area: 'Landour', share: 0.5, highlight: 'Landour walk, Kempty Falls', pricePerNightINR: 3200 }
    ], travelHours: 3, travelText: 'about 3 h drive Rishikesh → Mussoorie', highlights: ['River + hills', 'Short drives'] },
    { id: 'uk-haridwar-rishikesh', title: 'Haridwar + Rishikesh', tagline: 'A calm spiritual trip along the Ganga', bases: [
      { place: 'Haridwar', area: 'Har Ki Pauri', share: 0.4, highlight: 'Evening aarti at Har Ki Pauri', pricePerNightINR: 2000 },
      { place: 'Rishikesh', area: 'Ram Jhula', share: 0.6, highlight: 'Triveni Ghat, yoga, cafés', pricePerNightINR: 2400 }
    ], travelHours: 1, travelText: 'about 1 h drive between the two', highlights: ['Spiritual', 'Pure-veg friendly', 'Very little travel'] }
  ],
  kashmir: [
    { id: 'jk-srinagar-gulmarg', title: 'Srinagar + Gulmarg', tagline: 'Houseboat on Dal Lake, then the meadows and gondola', bases: [
      { place: 'Srinagar', area: 'Dal Lake houseboats', share: 0.6, highlight: 'Shikara ride, Mughal gardens', pricePerNightINR: 3500 },
      { place: 'Gulmarg', area: 'Gulmarg meadow', share: 0.4, highlight: 'Gondola, snow or summer meadows', pricePerNightINR: 4500 }
    ], travelHours: 1.5, travelText: 'about 1.5 h drive Srinagar → Gulmarg', highlights: ['Houseboat stay', 'Gondola', 'Short drives'] },
    { id: 'jk-srinagar-pahalgam', title: 'Srinagar + Pahalgam', tagline: 'Lakes and gardens, then quiet river valleys', bases: [
      { place: 'Srinagar', area: 'Dal Lake houseboats', share: 0.5, highlight: 'Shikara ride, old city', pricePerNightINR: 3500 },
      { place: 'Pahalgam', area: 'Lidder riverside', share: 0.5, highlight: 'Betaab and Aru valleys', pricePerNightINR: 3500 }
    ], travelHours: 2.5, travelText: 'about 2.5 h drive Srinagar → Pahalgam', highlights: ['Valleys', 'Riverside', 'Less crowded'], offbeat: true }
  ],
  ladakh: [
    { id: 'la-leh-nubra', title: 'Leh + Nubra Valley', tagline: 'Monasteries around Leh, then dunes over Khardung La', bases: [
      { place: 'Leh', area: 'Leh Main Bazaar', share: 0.6, highlight: 'Acclimatise, Shanti Stupa, Thiksey', pricePerNightINR: 3200 },
      { place: 'Nubra', area: 'Hunder', share: 0.4, highlight: 'Diskit Monastery, Hunder dunes', pricePerNightINR: 3500 }
    ], travelHours: 5, travelText: 'about 5 h drive via Khardung La', highlights: ['High passes', 'Acclimatise in Leh first'] },
    { id: 'la-leh-pangong', title: 'Leh + Pangong Lake', tagline: 'Leh base, then a night by the blue lake', bases: [
      { place: 'Leh', area: 'Changspa', share: 0.65, highlight: 'Leh Palace, monasteries', pricePerNightINR: 3200 },
      { place: 'Pangong', area: 'Spangmik lakeside camps', share: 0.35, highlight: 'Sunrise at Pangong Tso', pricePerNightINR: 4000 }
    ], travelHours: 5, travelText: 'about 5 h drive via Chang La', highlights: ['Lake camps', 'High altitude'] }
  ],
  sikkim: [
    { id: 'sk-gangtok-pelling', title: 'Gangtok + Pelling', tagline: 'Monasteries and lakes, then close-up Kanchenjunga views', bases: [
      { place: 'Gangtok', area: 'MG Marg', share: 0.55, highlight: 'MG Marg, Tsomgo Lake, Rumtek', pricePerNightINR: 3200 },
      { place: 'Pelling', area: 'Upper Pelling', share: 0.45, highlight: 'Kanchenjunga sunrise, Pemayangtse', pricePerNightINR: 3000 }
    ], travelHours: 5, travelText: 'about 5 h drive Gangtok → Pelling', highlights: ['Mountain views', 'Monasteries'] },
    { id: 'sk-gangtok-lachung', title: 'Gangtok + Lachung', tagline: 'North Sikkim: Yumthang valley of flowers', bases: [
      { place: 'Gangtok', area: 'MG Marg', share: 0.6, highlight: 'Gangtok sights, permits', pricePerNightINR: 3200 },
      { place: 'Lachung', area: 'Lachung village', share: 0.4, highlight: 'Yumthang Valley, Zero Point', pricePerNightINR: 2800 }
    ], travelHours: 6, travelText: 'about 6 h mountain drive (permit needed)', highlights: ['Remote valleys', 'Permit area'], offbeat: true }
  ],
  meghalaya: [
    { id: 'ml-shillong-cherrapunji', title: 'Shillong + Cherrapunji', tagline: 'Lakes and cafés, then waterfalls and root bridges', bases: [
      { place: 'Shillong', area: 'Laitumkhrah', share: 0.5, highlight: 'Umiam Lake, Shillong Peak', pricePerNightINR: 2800 },
      { place: 'Cherrapunji', area: 'Sohra', share: 0.5, highlight: 'Double-decker root bridge, Nohkalikai Falls', pricePerNightINR: 2600 }
    ], travelHours: 2, travelText: 'about 2 h drive Shillong → Cherrapunji', highlights: ['Waterfalls', 'Treks', 'Short drives'] },
    { id: 'ml-shillong-dawki', title: 'Shillong + Dawki', tagline: 'Clear-water river boating and the cleanest village', bases: [
      { place: 'Shillong', area: 'Police Bazaar', share: 0.5, highlight: 'Elephant Falls, cafés', pricePerNightINR: 2800 },
      { place: 'Dawki', area: 'Shnongpdeng riverside', share: 0.5, highlight: 'Umngot river, Mawlynnong', pricePerNightINR: 2400 }
    ], travelHours: 3, travelText: 'about 3 h drive Shillong → Dawki', highlights: ['River camping', 'Villages'], offbeat: true }
  ],
  northeast: [
    { id: 'ne-meghalaya-kaziranga', title: 'Shillong + Cherrapunji + Kaziranga', tagline: 'Meghalaya’s falls, then rhino safari in Assam', bases: [
      { place: 'Shillong', area: 'Laitumkhrah', share: 0.35, highlight: 'Umiam Lake, Shillong Peak', pricePerNightINR: 2800 },
      { place: 'Cherrapunji', area: 'Sohra', share: 0.3, highlight: 'Root bridges, waterfalls', pricePerNightINR: 2600 },
      { place: 'Kaziranga', area: 'Kohora', share: 0.35, highlight: 'Jeep safari', pricePerNightINR: 3200 }
    ], travelHours: 7, travelText: 'about 2 h + 5 h of driving in total', highlights: ['Two states', 'Wildlife', 'Waterfalls'] },
    { id: 'ne-gangtok-darjeeling', title: 'Gangtok + Darjeeling', tagline: 'Sikkim monasteries and Darjeeling tea hills', bases: [
      { place: 'Gangtok', area: 'MG Marg', share: 0.5, highlight: 'Tsomgo Lake, Rumtek', pricePerNightINR: 3200 },
      { place: 'Darjeeling', area: 'Mall Road (Chowrasta)', share: 0.5, highlight: 'Tiger Hill sunrise, toy train', pricePerNightINR: 3000 }
    ], travelHours: 4, travelText: 'about 4 h drive Gangtok → Darjeeling', highlights: ['Tea estates', 'Mountain views'] }
  ],
  tamilnadu: [
    { id: 'tn-pondy-mahabs', title: 'Mahabalipuram + Pondicherry', tagline: 'Shore temples, then the French Quarter by the sea', bases: [
      { place: 'Mahabalipuram', area: 'Shore Temple area', share: 0.4, highlight: 'Shore Temple, Pancha Rathas', pricePerNightINR: 3000 },
      { place: 'Pondicherry', area: 'White Town', share: 0.6, highlight: 'Promenade, Auroville', pricePerNightINR: 3200 }
    ], travelHours: 2, travelText: 'about 2 h coastal drive', highlights: ['Coast', 'Heritage', 'Short drives'] },
    { id: 'tn-madurai-rameswaram', title: 'Madurai + Rameswaram', tagline: 'Temple towns: Meenakshi Amman and Ramanathaswamy', bases: [
      { place: 'Madurai', area: 'Meenakshi Temple area', share: 0.5, highlight: 'Meenakshi Amman Temple', pricePerNightINR: 2200 },
      { place: 'Rameswaram', area: 'Temple town', share: 0.5, highlight: 'Temple corridors, Pamban Bridge, Dhanushkodi', pricePerNightINR: 2000 }
    ], travelHours: 3.5, travelText: 'about 3.5 h drive Madurai → Rameswaram', highlights: ['Temples', 'Pure-veg friendly'] }
  ],
  karnataka: [
    { id: 'ka-coorg-mysuru', title: 'Mysuru + Coorg', tagline: 'Palace city, then coffee-estate hills', bases: [
      { place: 'Mysuru', area: 'Palace area', share: 0.4, highlight: 'Mysore Palace, Chamundi Hill', pricePerNightINR: 2600 },
      { place: 'Coorg', area: 'Madikeri', share: 0.6, highlight: 'Coffee estates, Abbey Falls, Raja’s Seat', pricePerNightINR: 3200 }
    ], travelHours: 3, travelText: 'about 3 h drive Mysuru → Coorg', highlights: ['Heritage + hills', 'Easy from Bengaluru'] },
    { id: 'ka-hampi-gokarna', title: 'Hampi + Gokarna', tagline: 'Boulder-strewn ruins, then quiet beaches', bases: [
      { place: 'Hampi', area: 'Hampi Bazaar', share: 0.5, highlight: 'Vittala Temple, Hemakuta sunset', pricePerNightINR: 2000 },
      { place: 'Gokarna', area: 'Kudle Beach', share: 0.5, highlight: 'Om Beach, beach trek', pricePerNightINR: 2200 }
    ], travelHours: 6, travelText: 'about 6 h drive Hampi → Gokarna', highlights: ['Ruins + beaches', 'Budget friendly'], offbeat: true }
  ],
  gujarat: [
    { id: 'gj-ahmedabad-kutch', title: 'Ahmedabad + Rann of Kutch', tagline: 'Old-city heritage, then the white salt desert', bases: [
      { place: 'Ahmedabad', area: 'Old City', share: 0.4, highlight: 'Sabarmati Ashram, heritage walk', pricePerNightINR: 2800 },
      { place: 'Rann of Kutch', area: 'Dhordo (Rann Utsav)', share: 0.6, highlight: 'White Rann, Kalo Dungar, craft villages', pricePerNightINR: 4000 }
    ], travelHours: 7, travelText: 'about 7 h drive (or fly to Bhuj)', highlights: ['Desert', 'Crafts', 'Pure-veg friendly'] }
  ],
  madhyapradesh: [
    { id: 'mp-khajuraho-orchha', title: 'Khajuraho + Orchha', tagline: 'Temple carvings, then a quiet riverside fort town', bases: [
      { place: 'Khajuraho', area: 'Western Group area', share: 0.5, highlight: 'Western Group of Temples', pricePerNightINR: 2600 },
      { place: 'Orchha', area: 'Orchha Fort area', share: 0.5, highlight: 'Orchha Fort, Betwa cenotaphs', pricePerNightINR: 2400 }
    ], travelHours: 4, travelText: 'about 4 h drive Khajuraho → Orchha', highlights: ['Heritage', 'Less crowded'], offbeat: true }
  ],
  odisha: [
    { id: 'od-bhubaneswar-puri', title: 'Bhubaneswar + Puri', tagline: 'Temple city, then the beach and Konark', bases: [
      { place: 'Bhubaneswar', area: 'Old Town', share: 0.4, highlight: 'Lingaraj Temple, Udayagiri caves', pricePerNightINR: 2400 },
      { place: 'Puri', area: 'Swargadwar beach', share: 0.6, highlight: 'Puri beach, Konark Sun Temple, Chilika', pricePerNightINR: 2400 }
    ], travelHours: 1.5, travelText: 'about 1.5 h drive', highlights: ['Temples', 'Beach', 'Short drives'] }
  ],
  arunachal: [
    { id: 'ar-dirang-tawang', title: 'Dirang + Tawang', tagline: 'Apple-orchard valley, then the great monastery over Sela Pass', bases: [
      { place: 'Dirang', area: 'Dirang valley', share: 0.4, highlight: 'Dirang Dzong, Sangti Valley', pricePerNightINR: 2600 },
      { place: 'Tawang', area: 'Tawang town', share: 0.6, highlight: 'Tawang Monastery, Sela Pass, Madhuri Lake', pricePerNightINR: 2800 }
    ], travelHours: 4, travelText: 'about 4 h drive over Sela Pass (permit needed)', highlights: ['High passes', 'Permit area', 'Remote'], offbeat: true }
  ],
  assam: [
    { id: 'as-kaziranga-majuli', title: 'Kaziranga + Majuli', tagline: 'Rhino safari, then the river-island monasteries', bases: [
      { place: 'Kaziranga', area: 'Kohora', share: 0.5, highlight: 'Jeep safari, tea gardens', pricePerNightINR: 3200 },
      { place: 'Majuli', area: 'Garamur', share: 0.5, highlight: 'Satras, mask-making, Mising villages', pricePerNightINR: 2200 }
    ], travelHours: 3, travelText: 'about 3 h incl. the Brahmaputra ferry', highlights: ['Wildlife', 'River island', 'Culture'], offbeat: true }
  ]
};
