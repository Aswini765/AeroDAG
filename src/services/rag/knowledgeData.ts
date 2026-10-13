/**
 * AeroDAG Seed Knowledge Dataset
 * 
 * Curated, trusted travel knowledge documents for Singapore, Thailand, Vietnam, Japan,
 * and India domestic travel.
 * Explicitly attributes official sources and includes verification disclaimers.
 */

import { KnowledgeDocument } from '../../types/travelKnowledge';

export const SEED_KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  // =========================================================================
  // 1. SINGAPORE
  // =========================================================================
  {
    documentId: 'doc-sg-visa-01',
    title: 'Singapore Visa & SG Arrival Card (SGAC) Protocols for Indian Travellers',
    country: 'Singapore',
    destination: 'Singapore',
    category: 'VISA',
    sourceName: 'Immigration & Checkpoints Authority (ICA) Singapore',
    sourceUrl: 'https://www.ica.gov.sg/enter-transit-depart/entering-singapore',
    lastVerifiedAt: '2026-03-01',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Visa and entry requirements should be verified against the official government/consular source before travel.',
    summary: 'Electronic visa requirements through authorized visa agents and mandatory digital SG Arrival Card (SGAC) declaration.',
    tags: ['singapore', 'visa', 'sgac', 'immigration', 'ica', 'entry'],
    content: `Indian passport holders planning tourism travel to Singapore require an entry visa prior to departure. Singapore does not offer visa-on-arrival for general Indian tourists; applications must be submitted online through ICA-authorized visa agents or Singapore strategic partners.

Mandatory SG Arrival Card (SGAC):
All foreign visitors, including Singapore visa holders, must submit the electronic SG Arrival Card with Health Declaration within 3 days prior to arrival in Singapore via the official ICA website or MyICA Mobile app. Submission is free of charge.

Passport Validity:
Passports must have a minimum validity of 6 months beyond the intended date of departure from Singapore. Travellers must also possess confirmed return or onward flight tickets, sufficient funds for the duration of stay, and proof of accommodation.

Verification Notice:
Visa and entry requirements should be verified against the official government/consular source before travel. Consular policies may update depending on bilateral agreements.`
  },
  {
    documentId: 'doc-sg-family-01',
    title: 'Singapore Family Travel Guidelines: Children, Transit & Amenities',
    country: 'Singapore',
    destination: 'Singapore',
    category: 'FAMILY_TRAVEL',
    sourceName: 'Singapore Tourism Board (VisitSingapore)',
    sourceUrl: 'https://www.visitsingapore.com/travel-guide-tips/travelling-with-family/',
    lastVerifiedAt: '2026-02-15',
    trustLevel: 'VERIFIED_PARTNER',
    verificationNote: 'Family attraction ticketing and stroller accessibility guidelines are current as of quarterly review.',
    summary: 'Stroller accessibility, nursing rooms across Changi Airport and MRT, and child fare regulations.',
    tags: ['singapore', 'family', 'children', 'strollers', 'kids', 'mrt'],
    content: `Singapore is consistently recognized as one of the world's most family-friendly destinations with near-universal barrier-free accessibility.

Public Transit with Children:
Children under 0.9 meters in height travel free on the Singapore MRT network and public buses when accompanied by a paying adult. For children above 0.9m and under 7 years old, a complimentary Child Concession Card can be obtained at SimplyGo Ticket Offices upon presenting the child's passport.

Stroller Navigation:
Nearly 100% of MRT stations feature elevator access, tactile ground indicators, and wide automated fare gates accommodating standard and double strollers. Major attractions including Gardens by the Bay, Singapore Zoo, Universal Studios Singapore, and Jewel Changi feature paved pathways and rental stroller depots.

Parenting & Nursing Amenities:
Clean, air-conditioned nursing rooms ('Baby Care Rooms') equipped with hot water dispensers, changing pads, and private nursing cubicles are present at Changi Airport terminals, all major shopping malls along Orchard Road and Marina Bay, and key MRT interchanges.`
  },
  {
    documentId: 'doc-sg-transit-01',
    title: 'Singapore Changi Airport Navigation, Accessibility & MRT Transit',
    country: 'Singapore',
    destination: 'Singapore',
    category: 'TRANSPORT',
    sourceName: 'Changi Airport Group & Land Transport Authority (LTA)',
    sourceUrl: 'https://www.changiairport.com/',
    lastVerifiedAt: '2026-02-20',
    trustLevel: 'AIRPORT_AUTHORITY',
    verificationNote: 'Transit cards and contactless payment rules verified with LTA Singapore guidelines.',
    summary: 'Changi Airport inter-terminal Skytrain transit, contactless card payments on public transit, and accessibility.',
    tags: ['singapore', 'changi', 'airport', 'mrt', 'transport', 'jewel'],
    content: `Arrival at Singapore Changi Airport (SIN):
Changi Airport features 4 main passenger terminals connected by the automated complimentary Skytrain (Terminals 1, 2, and 3) and shuttle bus services to Terminal 4. Jewel Changi is directly connected to Terminal 1 Arrival Hall and via covered pedestrian footbridges to Terminals 2 and 3.

Public Transportation Options:
1. MRT Subway: The Changi Airport MRT station is located in the basements of Terminals 2 and 3. Foreign Mastercard, Visa contactless credit/debit cards, Apple Pay, and Google Pay can be tapped directly at all MRT and bus readers (SimplyGo system) without purchasing a physical travel card.
2. Taxis & Ride-Hailing: Official taxi ranks operate 24/7 at all terminal arrival halls with metered fares and airport surcharges. Grab and Gojek apps operate designated pickup bays at each terminal.

Senior Accessibility:
Changi Airport provides complimentary wheelchair assistance upon advance notice through your operating airline. Special priority seating and barrier-free elevators are standard throughout airport gates and MRT concourses.`
  },

  // =========================================================================
  // 2. THAILAND
  // =========================================================================
  {
    documentId: 'doc-th-visa-01',
    title: 'Thailand Entry Guidelines & Visa Protocols for Indian Nationals',
    country: 'Thailand',
    destination: 'Thailand',
    category: 'VISA',
    sourceName: 'Tourism Authority of Thailand & Ministry of Foreign Affairs',
    sourceUrl: 'https://www.thaievisa.go.th/',
    lastVerifiedAt: '2026-03-01',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Visa and entry requirements should be verified against the official government/consular source before travel.',
    summary: 'Visa on Arrival, electronic eVisa options, proof of funds requirements, and passport validity standards.',
    tags: ['thailand', 'bangkok', 'phuket', 'visa', 'entry', 'passport'],
    content: `Indian citizens travelling to Thailand for tourism may utilize official Visa on Arrival (VoA) counters at designated international airports (Suvarnabhumi, Don Mueang, Phuket, Chiang Mai) or apply in advance via the official Thailand e-Visa portal (thaievisa.go.th). Periodic temporary visa exemption schemes may be introduced by the Royal Thai Government.

Mandatory Entry Documentation Checklist:
1. Valid Passport: Must have at least 6 months validity from the date of arrival in Thailand and at least two blank pages.
2. Return / Onward Travel: Confirmed flight ticket exiting Thailand within the permissible stay period.
3. Proof of Accommodation: Hotel bookings or verifiable address of stay in Thailand.
4. Proof of Living Expenses: Minimum 10,000 THB per person (approx. ₹25,000) or 20,000 THB per family in verifiable cash or foreign currency equivalence.

Verification Notice:
Visa and entry requirements should be verified against the official government/consular source before travel. Bilateral visa waiver durations and VoA fees are subject to government cabinet renewals.`
  },
  {
    documentId: 'doc-th-senior-01',
    title: 'Thailand Senior & Multigenerational Travel: Heat, Pacing & Accessibility',
    country: 'Thailand',
    destination: 'Thailand',
    category: 'SENIOR_TRAVEL',
    sourceName: 'Tourism Authority of Thailand (TAT) Medical & Wellness Travel',
    sourceUrl: 'https://www.tourismthailand.org/',
    lastVerifiedAt: '2026-02-10',
    trustLevel: 'VERIFIED_PARTNER',
    verificationNote: 'Accessibility advice reflects urban infrastructure realities in Bangkok and resort islands.',
    summary: 'Pacing strategies for tropical heat, accessible temple visits, private AC transport, and healthcare infrastructure.',
    tags: ['thailand', 'senior', 'elderly', 'accessibility', 'bangkok', 'pacing'],
    content: `Thailand offers warm hospitality and world-class private healthcare, but requires intentional planning for elderly travellers and multigenerational families.

Tropical Climate & Heat Management:
Daytime temperatures in Bangkok and southern islands regularly exceed 33°C (91°F) with high humidity. Seniors should schedule outdoor sightseeing (e.g. Grand Palace, Wat Pho, Chatuchak) strictly between 08:30 AM and 11:00 AM or after 04:30 PM. The midday block (12:00 PM – 03:30 PM) is best allocated to air-conditioned dining, hotel rest, or river cruises.

Sidewalk & Infrastructure Realities:
Bangkok street pavements often feature uneven tiles, high curbs, and elevated pedestrian overpasses without escalators. For seniors with limited walking tolerance, relying exclusively on street walking is not recommended. Booking pre-arranged private air-conditioned vehicles (Innova / commuter van) or using BTS Skytrain stations with verified elevator access minimizes physical exhaustion.

Temple Etiquette & Modesty:
Sacred royal temples require shoulders and knees to be fully covered. Seniors should wear lightweight, breathable linen or cotton trousers and slip-on shoes, as footwear must be removed upon entering temple viharas.`
  },
  {
    documentId: 'doc-th-family-01',
    title: 'Thailand Family Travel Essentials: Beaches, Safety & Hygiene',
    country: 'Thailand',
    destination: 'Thailand',
    category: 'FAMILY_TRAVEL',
    sourceName: 'TAT Family Travel Advisory',
    sourceUrl: 'https://www.tourismthailand.org/Articles/family-friendly-thailand',
    lastVerifiedAt: '2026-02-18',
    trustLevel: 'CURATED_GUIDE',
    verificationNote: 'Verified beach safety flag system and food hygiene recommendations for minors.',
    summary: 'Family-friendly beach hubs, water safety regulations, food hygiene for children, and medical access.',
    tags: ['thailand', 'family', 'kids', 'phuket', 'krabi', 'beach-safety'],
    content: `Traveling with children in Thailand is culturally celebrated, with widespread family facilities across Phuket, Krabi, Koh Samui, and Bangkok.

Beach Water Safety:
During the Andaman Sea southwest monsoon (May through October), strong undercurrents and rip tides affect open beaches in Phuket and Krabi. Families with children must strictly observe beach warning flags:
- Red Flag: High hazard; swimming strictly prohibited.
- Yellow Flag: Medium hazard; swim with caution, lifejackets advised.
- Red/Yellow Flag: Lifeguard supervised swimming zone.

Food & Water Hygiene for Minors:
Never drink unboiled tap water. Only consume commercially bottled water with intact seals. For children, choose freshly cooked, steaming-hot dishes from high-turnover food establishments. Avoid pre-sliced fruits stored on open ice blocks; opt instead for whole fruits peeled in front of you (bananas, mangoes, coconuts).

Medical Facilities:
Bangkok and Phuket host internationally accredited hospitals (e.g., Bumrungrad International, Bangkok Hospital) with dedicated pediatric emergency departments and English-speaking medical staff.`
  },

  // =========================================================================
  // 3. VIETNAM
  // =========================================================================
  {
    documentId: 'doc-vn-visa-01',
    title: 'Vietnam Electronic Visa (e-Visa) Procedures & Border Clearance for Indians',
    country: 'Vietnam',
    destination: 'Vietnam',
    category: 'VISA',
    sourceName: 'Vietnam National Immigration Department (Ministry of Public Security)',
    sourceUrl: 'https://evisa.xuatnhapcanh.gov.vn/',
    lastVerifiedAt: '2026-03-01',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Visa and entry requirements should be verified against the official government/consular source before travel.',
    summary: 'Official electronic visa application portal, processing times, fee structures, and entry checkpoint rules.',
    tags: ['vietnam', 'visa', 'evisa', 'hanoi', 'da-nang', 'entry-rules'],
    content: `Indian passport holders can obtain an electronic tourist visa (e-Visa) for Vietnam through the official government portal: evisa.xuatnhapcanh.gov.vn. E-visas are valid for up to 90 days and can be issued for single or multiple entries.

Application Requirements:
1. High-resolution passport biodata page photo (minimum 6 months remaining validity from arrival date).
2. Recent 4x6 cm white-background portrait photo (no glasses, straight gaze).
3. Visa processing fee: Non-refundable fee paid online via international card. Standard processing takes 3–5 working days; applying at least 2 weeks before departure is strongly recommended.
4. Designated Entry Port: You must enter through the international airport or border checkpoint specified in your approved e-Visa (e.g. Noi Bai Airport in Hanoi, Tan Son Nhat Airport in Ho Chi Minh City, Da Nang Airport).

Crucial Arrival Protocol:
Carry two hard-copy physical printouts of your approved e-Visa certificate. Immigration officers at Vietnamese border gates require physical paper verification before stamping entry stamps.

Verification Notice:
Visa and entry requirements should be verified against the official government/consular source before travel. Never use unauthorized third-party broker websites claiming to offer expedited government visas without verifying accreditation.`
  },
  {
    documentId: 'doc-vn-prep-01',
    title: 'Vietnam Travel Preparation: Currency, Connectivity & Health Protocols',
    country: 'Vietnam',
    destination: 'Vietnam',
    category: 'TRAVEL_POLICY',
    sourceName: 'Vietnam National Administration of Tourism (VNAT)',
    sourceUrl: 'https://vietnam.travel/',
    lastVerifiedAt: '2026-02-12',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Currency conversion and telecommunications regulations updated for current fiscal season.',
    summary: 'Vietnamese Dong currency handling, tourist SIM card registration, Grab ride-hailing, and street navigation.',
    tags: ['vietnam', 'preparation', 'currency', 'dong', 'sim', 'safety'],
    content: `Currency Handling:
The currency is the Vietnamese Dong (VND). Vietnam remains largely a cash-preferred economy for street vendors, traditional markets, and small cafes, while hotels, upscale restaurants, and modern supermarkets accept Visa and Mastercard. Carry pristine, unmarked US Dollars (USD) or international debit cards with zero foreign transaction fees to exchange or withdraw Dong at airport banks or gold shops in Hanoi and Da Nang.

Local Transport & Ride-Hailing:
Download the Grab app prior to arrival. Grab operates seamlessly in Hanoi, Da Nang, and Ho Chi Minh City for private cars and scooters with upfront fixed pricing, preventing taxi meter scams. For airport arrivals, pre-booked private transfers arranged with vouchers eliminate negotiation friction.

SIM & Connectivity:
eSIMs or physical tourist SIMs (Viettel or Vinaphone) can be purchased at official kiosks past airport customs. Under Vietnamese telecommunications law, tourist SIMs require passport registration at purchase.`
  },
  {
    documentId: 'doc-vn-family-01',
    title: 'Vietnam Family Travel: Halong Bay Cruise Protocols & Urban Navigation',
    country: 'Vietnam',
    destination: 'Vietnam',
    category: 'FAMILY_TRAVEL',
    sourceName: 'Quang Ninh Tourism Board & VNAT Family Advisory',
    sourceUrl: 'https://vietnam.travel/things-to-do/family-travel-vietnam',
    lastVerifiedAt: '2026-02-25',
    trustLevel: 'VERIFIED_PARTNER',
    verificationNote: 'Maritime maritime safety standards for children verified with Halong Bay port authority.',
    summary: 'Halong Bay safety equipment for minors, navigating Hanoi Old Quarter pedestrian traffic, and child food options.',
    tags: ['vietnam', 'family', 'children', 'halong-bay', 'cruise', 'hanoi'],
    content: `Halong Bay Maritime Safety for Minors:
All overnight and day cruises operating in Halong Bay and Lan Ha Bay are strictly regulated by the Quang Ninh Maritime Administration. Ships are required to provide certified child-sized life vests. Parents should confirm with their tour operator that child lifejackets are stocked in advance of embarkation. Minor children must wear life vests whenever boarding tenders or participating in kayaking and bamboo boat excursions.

Hanoi Old Quarter Pedestrian Realities:
Sidewalks in Hanoi's Old Quarter are frequently occupied by parked scooters and sidewalk food stools, requiring pedestrians to walk along street edges. Traffic flows in a steady stream: the local rule is to walk at a slow, predictable, consistent pace across crosswalks, allowing scooter drivers to anticipate your trajectory. Never make sudden running dashes across traffic.

Dietary Options for Children:
Mild, comforting Vietnamese dishes well-suited for young children include Pho Ga (chicken noodle soup with mild clear broth), Com Ga (steamed rice with tender chicken), and Banh Mi with eggs or mild fillings.`
  },

  // =========================================================================
  // 4. JAPAN
  // =========================================================================
  {
    documentId: 'doc-jp-visa-01',
    title: 'Japan Electronic Visa (JAPAN eVISA) & Visit Japan Web Procedures for Indians',
    country: 'Japan',
    destination: 'Japan',
    category: 'VISA',
    sourceName: 'Ministry of Foreign Affairs of Japan (MOFA)',
    sourceUrl: 'https://www.mofa.go.jp/j_info/visit/visa/index.html',
    lastVerifiedAt: '2026-03-01',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Visa and entry requirements should be verified against the official government/consular source before travel.',
    summary: 'Short-term tourism electronic visa procedures, processing portals, and Visit Japan Web customs QR codes.',
    tags: ['japan', 'tokyo', 'kyoto', 'visa', 'evisa', 'mofa', 'visit-japan-web'],
    content: `Indian nationals residing in India who hold ordinary passports and are traveling to Japan for tourism purposes (single entry, stay up to 90 days) can apply for a digital tourist visa through the JAPAN eVISA portal or authorized VFS Global visa application centers.

Visit Japan Web System:
Prior to departure, all international travellers are strongly encouraged to register their travel details on the official "Visit Japan Web" digital service (vjw-lp.digital.go.jp). This generates two separate QR codes:
1. Immigration Clearance QR Code (disembarks electronic gate processing).
2. Customs Declaration QR Code (allows rapid automated terminal clearance at Haneda, Narita, Kansai, and Fukuoka airports).

Passport & Document Standards:
Passports must be valid for at least 6 months beyond the stay period with at least two blank visa pages. Applicants must provide confirmed round-trip flight itineraries, daily schedule itinerary vouchers, proof of financial solvency (recent income tax returns and bank statements), and confirmed hotel reservations.

Verification Notice:
Visa and entry requirements should be verified against the official government/consular source before travel. Visa fees and processing timelines are established by the Embassy of Japan in New Delhi.`
  },
  {
    documentId: 'doc-jp-prep-01',
    title: 'Japan Travel Preparation: IC Transit Cards, Luggage Forwarding & Cash Etiquette',
    country: 'Japan',
    destination: 'Japan',
    category: 'TRANSPORT',
    sourceName: 'Japan National Tourism Organization (JNTO)',
    sourceUrl: 'https://www.japan.travel/en/plan/',
    lastVerifiedAt: '2026-02-14',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Transit card availability (Welcome Suica/Pasmo) verified with JR East standards.',
    summary: 'IC card navigation (Suica/Pasmo), luggage forwarding (Takkyubin), and cash etiquette for local transit.',
    tags: ['japan', 'transit', 'shinkansen', 'suica', 'pasmo', 'luggage', 'tokyo'],
    content: `Transit & Contactless IC Cards:
Public transport in Tokyo, Kyoto, and Osaka utilizes rechargeable contactless IC cards (Suica or Pasmo). Due to global semiconductor shortages, physical anonymous Suica cards may have restricted sales; travellers can purchase a digital "Welcome Suica" / "Pasmo Passport" at airport train stations, or add a digital Suica directly to Apple Wallet prior to landing. Tapping an IC card covers subway rides, local trains, city buses, and vending machines.

Luggage Forwarding (Takkyubin):
Japan's nationwide luggage forwarding service (Yamato Transport "Black Cat") allows travellers to send heavy suitcases directly from Tokyo hotels to their next destination hotel in Kyoto or Osaka for roughly ¥2,000–¥3,000 per bag. This avoids dragging oversized bags onto crowded Shinkansen bullet trains, where bags with total dimensions exceeding 160 cm require pre-reserved luggage seat reservations.

Cash vs. Card Culture:
While major department stores and chain hotels accept foreign credit cards, local ramen shops, temple entrance ticket booths, ticket machines, and traditional ryokans require Japanese Yen (JPY) in cash. 7-Eleven ATMs (Seven Bank) reliably accept foreign debit and credit cards with minimal foreign fees.`
  },
  {
    documentId: 'doc-jp-senior-01',
    title: 'Japan Senior & Accessibility Guidelines: Step Counts, Elevators & Temple Terrain',
    country: 'Japan',
    destination: 'Japan',
    category: 'SENIOR_TRAVEL',
    sourceName: 'JNTO Accessible Japan Guide',
    sourceUrl: 'https://www.accessible-japan.com/',
    lastVerifiedAt: '2026-02-22',
    trustLevel: 'VERIFIED_PARTNER',
    verificationNote: 'Barrier-free facility guidelines verified across Tokyo Metro and JR networks.',
    summary: 'Managing high daily walking intensity, finding accessible elevator exits, and temple gravel navigation.',
    tags: ['japan', 'senior', 'accessibility', 'walking', 'barrier-free', 'kyoto'],
    content: `Walking Intensity Considerations:
A standard tourist day in Tokyo or Kyoto typically involves 12,000 to 18,000 steps. Major subway stations (such as Shinjuku, Tokyo Station, Shibuya) require substantial walking across sprawling underground concourses. Seniors should plan for intentional downtime and avoid rushing between train transfers.

Elevator Navigation:
Almost all Japanese train and subway stations feature barrier-free routes with elevators, but they are often situated at specific car positions on the platform. Looking at yellow overhead platform maps indicates the exact car number that stops directly in front of the elevator.

Temple Terrain in Kyoto:
Historic shrines and temple gardens (such as Fushimi Inari, Kiyomizu-dera, Ginkaku-ji) feature uneven stone staircases, steep inclines, and deep raked gravel paths where pushing wheelchairs or walking with a cane requires extra effort. Plan visits during early morning hours and utilize wheelchair-accessible taxi drop-off locations designated near secondary temple gates.`
  },

  // =========================================================================
  // 5. INDIA DOMESTIC TRAVEL
  // =========================================================================
  {
    documentId: 'doc-in-id-01',
    title: 'India Domestic Travel Regulations: Mandatory Photo ID & Airport Check-In',
    country: 'India',
    destination: 'India',
    category: 'ENTRY_REQUIREMENTS',
    sourceName: 'Bureau of Civil Aviation Security (BCAS) & Ministry of Civil Aviation',
    sourceUrl: 'https://www.bcasindia.gov.in/',
    lastVerifiedAt: '2026-03-01',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Domestic identity guidelines comply with BCAS and Ministry of Home Affairs circulars.',
    summary: 'Mandatory government photo identity cards for domestic flights and hotel verification.',
    tags: ['india', 'domestic', 'goa', 'id', 'bcas', 'aadhaar', 'airport'],
    content: `Mandatory Identification for Domestic Travel within India:
Under Bureau of Civil Aviation Security (BCAS) regulations, every adult passenger travelling on domestic flights within India must present a valid government-issued original photo identity document at the airport departure gate and airline check-in counter.

Accepted Photo ID Documents for Adults:
1. Aadhaar Card (physical card or official digital mAadhaar app).
2. Passport issued by the Government of India.
3. Voter Identity Card (EPIC).
4. Permanent Driving License issued by State Transport Authority.
5. PAN Card issued by the Income Tax Department.
6. Central or State Government employee photo identity card.

Minor Children (Under 18 Years):
Infants and children travelling with parents do not strictly require a photo ID if accompanied by an adult who possesses valid identification; however, carrying the child's original School ID card or Birth Certificate is strongly recommended for seamless age verification.

Hotel Check-in Rule:
Under the Registration of Foreigners Act and Indian State Police regulatory mandates, hotels and resorts in Goa, Kerala, Rajasthan, and across India must verify and log government photo IDs for every checking-in adult guest.`
  },
  {
    documentId: 'doc-in-digiyatra-01',
    title: 'DigiYatra Biometric Borderless Boarding at Indian Airports',
    country: 'India',
    destination: 'India',
    category: 'AIRPORT',
    sourceName: 'Digi Yatra Foundation & Ministry of Civil Aviation',
    sourceUrl: 'https://www.digiyatra.com/',
    lastVerifiedAt: '2026-02-28',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Operational at major metro and tourist hubs including BLR, DEL, BOM, GOI, COK.',
    summary: 'Contactless biometric facial recognition entry at airport gates and security checkpoints.',
    tags: ['india', 'digiyatra', 'airport', 'bengaluru', 'goa', 'biometrics'],
    content: `DigiYatra Ecosystem:
DigiYatra is an industry-leading biometric facial recognition boarding system deployed across Indian airports including Bengaluru (Kempegowda International Airport - BLR), Delhi (DEL), Mumbai (BOM), Hyderabad (HYD), and Goa (Dabolim and MOPA).

How It Works for Travellers:
1. Pre-Enrollment: Passengers link their Aadhaar-based credentials and take a selfie on the DigiYatra mobile app.
2. Boarding Pass Scan: Scan your domestic boarding pass barcode 24 hours prior to flight departure.
3. Rapid Gate Clearance: At the departure airport, dedicated DigiYatra e-gates scan the traveller's face and match the flight ticket in under 3 seconds, bypassing manual security queues.

Privacy & Data Policy:
DigiYatra operates on decentralized self-sovereign identity principles. Passengers' facial biometric data is stored locally in their personal mobile device and is automatically purged from the airport terminal system within 24 hours of flight departure.`
  },
  {
    documentId: 'doc-in-goa-safety-01',
    title: 'Goa Coastal Safety, Beach Flags & Local Transport Advisory',
    country: 'India',
    destination: 'Goa',
    category: 'DESTINATION_INFO',
    sourceName: 'Department of Tourism, Government of Goa & Drishti Marine Lifesavers',
    sourceUrl: 'https://goatourism.gov.in/',
    lastVerifiedAt: '2026-02-18',
    trustLevel: 'OFFICIAL_GOVERNMENT',
    verificationNote: 'Beach flag safety regulations enforced 365 days across all 40 monitored Goa beaches.',
    summary: 'Goa beach swimming flag regulations, water sports safety, and local taxi app pricing.',
    tags: ['goa', 'beach', 'safety', 'drishti', 'swimming', 'transport', 'taxi'],
    content: `Beach Flag Warning System (Drishti Marine Lifesavers):
Goa's 105-kilometer coastline is actively monitored by trained lifeguards. Travellers must strictly adhere to beach marker flags:
- Red Flag: High danger zone; swimming is strictly forbidden due to rip currents and sudden drop-offs.
- Red over Yellow Flag: Dedicated supervised swimming zone with active lifeguard towers.
- Black and White Checkered Flag: Watercraft zone (Jet skis, banana boats); swimmers must stay clear.

Local Transportation & Taxis:
Traditional airport taxi stands operate on fixed government prepaid tariffs. To avoid street negotiation, visitors can utilize the official "GoaMiles" app (authorized by Goa Tourism Development Corporation) for metered point-to-point AC cabs. Pre-arranged private transfers booked in advance with chauffeur meet-and-greet placards ensure seamless transit directly to South or North Goa resorts without waiting in taxi queues.`
  }
];
