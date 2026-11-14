/**
 * India-wide offline place reference.
 *
 * Used when the AI destination profile is unavailable (busy, timed out, odd reply),
 * so a user who types any Indian place still gets a plan instead of an error.
 * Facts here are stable reference data (nearest airport, well-known sights, stay areas).
 * Prices are rough per-person daily estimates by cost level and are always shown as "Estimate".
 */
import type { DestinationProfile } from '../types/destinationProfile';

type CostLevel = 'low' | 'mid' | 'high';

interface PlaceRef {
  name: string;
  aliases?: string[];
  state: string;
  airport?: { code: string; name: string; hours: number };
  rail?: { name: string; hours: number };
  areas: string[];
  sights: string[];
  bestMonths: string;
  cost: CostLevel;
  veg?: 'low' | 'medium' | 'high';
}

export const INDIA_PLACES: PlaceRef[] = [
  // Himalaya & north
  { name: 'Manali', aliases: ['kullu manali'], state: 'Himachal Pradesh', airport: { code: 'KUU', name: 'Bhuntar (Kullu)', hours: 1.5 }, areas: ['Old Manali', 'Mall Road', 'Vashisht'], sights: ['Hadimba Temple', 'Solang Valley', 'Old Manali village', 'Vashisht hot springs', 'Jogini Falls'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'mid' },
  { name: 'Shimla', state: 'Himachal Pradesh', airport: { code: 'IXC', name: 'Chandigarh', hours: 3.5 }, rail: { name: 'Shimla (toy train from Kalka)', hours: 0.2 }, areas: ['Mall Road', 'Lakkar Bazaar', 'Chotta Shimla'], sights: ['The Ridge & Mall Road', 'Jakhu Temple', 'Kufri', 'Christ Church', 'Kalka–Shimla toy train'], bestMonths: 'Mar–Jun, Oct–Dec', cost: 'mid' },
  { name: 'Dharamshala', aliases: ['mcleodganj', 'mcleod ganj'], state: 'Himachal Pradesh', airport: { code: 'DHM', name: 'Gaggal (Kangra)', hours: 0.5 }, areas: ['McLeod Ganj', 'Bhagsu', 'Dharamkot'], sights: ['Tsuglagkhang (Dalai Lama Temple)', 'Bhagsu Falls', 'Triund trek', 'HPCA Stadium', 'Naddi viewpoint'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'low' },
  { name: 'Kasol', aliases: ['parvati valley'], state: 'Himachal Pradesh', airport: { code: 'KUU', name: 'Bhuntar (Kullu)', hours: 1.5 }, areas: ['Kasol market', 'Chalal', 'Manikaran'], sights: ['Parvati riverside', 'Chalal village walk', 'Manikaran Sahib', 'Tosh village'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'low' },
  { name: 'Spiti', aliases: ['spiti valley', 'kaza'], state: 'Himachal Pradesh', airport: { code: 'KUU', name: 'Bhuntar (Kullu)', hours: 8 }, areas: ['Kaza', 'Tabo'], sights: ['Key Monastery', 'Kibber village', 'Langza fossil village', 'Chandratal Lake', 'Tabo Monastery'], bestMonths: 'Jun–Sep', cost: 'mid' },
  { name: 'Rishikesh', state: 'Uttarakhand', airport: { code: 'DED', name: 'Dehradun (Jolly Grant)', hours: 0.75 }, rail: { name: 'Yog Nagari Rishikesh', hours: 0.2 }, areas: ['Tapovan', 'Laxman Jhula', 'Ram Jhula'], sights: ['Ganga Aarti at Triveni Ghat', 'Laxman Jhula', 'River rafting from Shivpuri', 'Beatles Ashram', 'Neer Garh waterfall'], bestMonths: 'Sep–Nov, Feb–May', cost: 'low', veg: 'high' },
  { name: 'Haridwar', state: 'Uttarakhand', airport: { code: 'DED', name: 'Dehradun (Jolly Grant)', hours: 1 }, rail: { name: 'Haridwar Junction', hours: 0.2 }, areas: ['Har Ki Pauri', 'Jwalapur'], sights: ['Ganga Aarti at Har Ki Pauri', 'Mansa Devi Temple', 'Chandi Devi Temple', 'Rajaji National Park'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Mussoorie', state: 'Uttarakhand', airport: { code: 'DED', name: 'Dehradun (Jolly Grant)', hours: 2 }, areas: ['Mall Road', 'Landour', 'Library Chowk'], sights: ['Landour walk', 'Kempty Falls', 'Gun Hill', 'Camel’s Back Road', 'Lal Tibba'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'mid' },
  { name: 'Nainital', state: 'Uttarakhand', airport: { code: 'PGH', name: 'Pantnagar', hours: 2 }, rail: { name: 'Kathgodam', hours: 1.25 }, areas: ['Mall Road', 'Tallital', 'Mallital'], sights: ['Naini Lake boating', 'Snow View Point', 'Naina Devi Temple', 'Bhimtal', 'Tiffin Top'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'mid' },
  { name: 'Leh', aliases: ['leh ladakh'], state: 'Ladakh', airport: { code: 'IXL', name: 'Leh', hours: 0.25 }, areas: ['Leh Main Bazaar', 'Changspa'], sights: ['Shanti Stupa', 'Leh Palace', 'Thiksey Monastery', 'Pangong Lake (day trip)', 'Nubra Valley via Khardung La'], bestMonths: 'May–Sep', cost: 'mid' },
  { name: 'Srinagar', state: 'Jammu & Kashmir', airport: { code: 'SXR', name: 'Srinagar', hours: 0.5 }, areas: ['Dal Lake houseboats', 'Rajbagh', 'Boulevard Road'], sights: ['Shikara ride on Dal Lake', 'Nishat Bagh', 'Shalimar Bagh', 'Old city & Jama Masjid', 'Hazratbal'], bestMonths: 'Mar–Oct', cost: 'mid' },
  { name: 'Gulmarg', state: 'Jammu & Kashmir', airport: { code: 'SXR', name: 'Srinagar', hours: 1.5 }, areas: ['Gulmarg meadow'], sights: ['Gulmarg Gondola', 'Alpather Lake (summer)', 'St Mary’s Church', 'Skiing (Dec–Mar)'], bestMonths: 'Dec–Mar, May–Sep', cost: 'high' },
  { name: 'Amritsar', state: 'Punjab', airport: { code: 'ATQ', name: 'Amritsar', hours: 0.5 }, areas: ['Golden Temple area', 'Ranjit Avenue'], sights: ['Golden Temple', 'Jallianwala Bagh', 'Wagah–Attari border ceremony', 'Partition Museum'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Varanasi', aliases: ['banaras', 'kashi'], state: 'Uttar Pradesh', airport: { code: 'VNS', name: 'Varanasi', hours: 0.75 }, rail: { name: 'Varanasi Junction', hours: 0.3 }, areas: ['Assi Ghat', 'Dashashwamedh', 'Godowlia'], sights: ['Ganga Aarti at Dashashwamedh Ghat', 'Sunrise boat ride', 'Kashi Vishwanath Temple', 'Sarnath', 'Assi Ghat'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Agra', state: 'Uttar Pradesh', airport: { code: 'DEL', name: 'Delhi', hours: 3.5 }, rail: { name: 'Agra Cantt', hours: 0.3 }, areas: ['Taj Ganj', 'Fatehabad Road'], sights: ['Taj Mahal at sunrise', 'Agra Fort', 'Mehtab Bagh', 'Fatehpur Sikri'], bestMonths: 'Oct–Mar', cost: 'mid' },
  // Rajasthan & west
  { name: 'Jaipur', state: 'Rajasthan', airport: { code: 'JAI', name: 'Jaipur', hours: 0.5 }, areas: ['C-Scheme', 'Old City', 'Bani Park'], sights: ['Amber Fort', 'City Palace', 'Hawa Mahal', 'Jantar Mantar', 'Nahargarh sunset'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Jodhpur', state: 'Rajasthan', airport: { code: 'JDH', name: 'Jodhpur', hours: 0.5 }, areas: ['Old City (Blue City)', 'Ratanada'], sights: ['Mehrangarh Fort', 'Jaswant Thada', 'Clock Tower market', 'Umaid Bhawan Museum'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Jaisalmer', state: 'Rajasthan', airport: { code: 'JSA', name: 'Jaisalmer', hours: 0.5 }, areas: ['Fort area', 'Sam Sand Dunes'], sights: ['Jaisalmer Fort', 'Patwon ki Haveli', 'Sam dunes camp', 'Gadisar Lake'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Pushkar', state: 'Rajasthan', airport: { code: 'JAI', name: 'Jaipur', hours: 3 }, areas: ['Pushkar Lake'], sights: ['Pushkar Lake ghats', 'Brahma Temple', 'Savitri Temple sunset', 'Pushkar bazaar'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Mount Abu', state: 'Rajasthan', airport: { code: 'UDR', name: 'Udaipur', hours: 3.5 }, areas: ['Nakki Lake'], sights: ['Dilwara Temples', 'Nakki Lake', 'Guru Shikhar', 'Sunset Point'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Rann of Kutch', aliases: ['kutch', 'white rann', 'dhordo'], state: 'Gujarat', airport: { code: 'BHJ', name: 'Bhuj', hours: 2 }, areas: ['Dhordo (Rann Utsav)', 'Bhuj'], sights: ['White Rann at full moon', 'Kalo Dungar', 'Bhujodi craft village', 'Aina Mahal'], bestMonths: 'Nov–Feb', cost: 'mid', veg: 'high' },
  { name: 'Mumbai', aliases: ['bombay'], state: 'Maharashtra', airport: { code: 'BOM', name: 'Mumbai', hours: 0.75 }, areas: ['Colaba', 'Bandra', 'Juhu'], sights: ['Gateway of India', 'Marine Drive', 'Elephanta Caves', 'Bandra Bandstand', 'Chhatrapati Shivaji Terminus'], bestMonths: 'Nov–Feb', cost: 'high' },
  { name: 'Lonavala', state: 'Maharashtra', airport: { code: 'PNQ', name: 'Pune', hours: 1.5 }, areas: ['Lonavala town', 'Khandala'], sights: ['Tiger’s Leap', 'Karla Caves', 'Bhushi Dam', 'Rajmachi viewpoint'], bestMonths: 'Jun–Feb', cost: 'mid' },
  { name: 'Mahabaleshwar', state: 'Maharashtra', airport: { code: 'PNQ', name: 'Pune', hours: 3 }, areas: ['Main Market'], sights: ['Arthur’s Seat', 'Venna Lake', 'Pratapgad Fort', 'Strawberry farms (Dec–Apr)'], bestMonths: 'Oct–May', cost: 'mid' },
  { name: 'Khajuraho', state: 'Madhya Pradesh', airport: { code: 'HJR', name: 'Khajuraho', hours: 0.25 }, areas: ['Western Group area'], sights: ['Western Group of Temples', 'Light & sound show', 'Panna National Park', 'Raneh Falls'], bestMonths: 'Oct–Mar', cost: 'mid' },
  // South
  { name: 'Hampi', state: 'Karnataka', airport: { code: 'VDY', name: 'Jindal Vijaynagar', hours: 1 }, rail: { name: 'Hosapete', hours: 0.5 }, areas: ['Hampi Bazaar', 'Hippie Island (Virupapur Gadde)'], sights: ['Virupaksha Temple', 'Vittala Temple & Stone Chariot', 'Hemakuta Hill sunset', 'Coracle ride at Tungabhadra', 'Lotus Mahal'], bestMonths: 'Oct–Feb', cost: 'low' },
  { name: 'Gokarna', state: 'Karnataka', airport: { code: 'GOI', name: 'Goa (Dabolim)', hours: 3 }, rail: { name: 'Gokarna Road', hours: 0.3 }, areas: ['Kudle Beach', 'Om Beach', 'Gokarna town'], sights: ['Om Beach', 'Kudle Beach', 'Half Moon & Paradise beach trek', 'Mahabaleshwar Temple'], bestMonths: 'Oct–Mar', cost: 'low' },
  { name: 'Chikmagalur', aliases: ['chikkamagaluru'], state: 'Karnataka', airport: { code: 'IXE', name: 'Mangaluru', hours: 3 }, areas: ['Chikmagalur town', 'Mullayanagiri road'], sights: ['Mullayanagiri peak', 'Baba Budangiri', 'Coffee estate walk', 'Hebbe Falls'], bestMonths: 'Sep–Mar', cost: 'mid' },
  { name: 'Ooty', aliases: ['udhagamandalam', 'ooty nilgiris'], state: 'Tamil Nadu', airport: { code: 'CJB', name: 'Coimbatore', hours: 3 }, rail: { name: 'Nilgiri Mountain Railway (from Mettupalayam)', hours: 0.2 }, areas: ['Charing Cross', 'Fern Hill'], sights: ['Nilgiri Mountain Railway', 'Botanical Garden', 'Doddabetta Peak', 'Pykara Lake', 'Tea factory visit'], bestMonths: 'Mar–Jun, Oct–Dec', cost: 'mid' },
  { name: 'Kodaikanal', state: 'Tamil Nadu', airport: { code: 'IXM', name: 'Madurai', hours: 3.5 }, areas: ['Kodai Lake', 'Coaker’s Walk'], sights: ['Kodai Lake', 'Coaker’s Walk', 'Pillar Rocks', 'Bryant Park'], bestMonths: 'Mar–Jun, Sep–Oct', cost: 'mid' },
  { name: 'Pondicherry', aliases: ['puducherry', 'pondy'], state: 'Puducherry', airport: { code: 'MAA', name: 'Chennai', hours: 3 }, areas: ['White Town', 'Auroville'], sights: ['Promenade Beach', 'French Quarter walk', 'Auroville & Matrimandir', 'Paradise Beach'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Mahabalipuram', aliases: ['mamallapuram'], state: 'Tamil Nadu', airport: { code: 'MAA', name: 'Chennai', hours: 1.5 }, areas: ['Shore Temple area'], sights: ['Shore Temple', 'Pancha Rathas', 'Arjuna’s Penance', 'Krishna’s Butterball'], bestMonths: 'Nov–Feb', cost: 'mid' },
  { name: 'Madurai', state: 'Tamil Nadu', airport: { code: 'IXM', name: 'Madurai', hours: 0.5 }, areas: ['Meenakshi Temple area'], sights: ['Meenakshi Amman Temple', 'Thirumalai Nayakkar Mahal', 'Gandhi Museum'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Rameswaram', state: 'Tamil Nadu', airport: { code: 'IXM', name: 'Madurai', hours: 3.5 }, areas: ['Temple town'], sights: ['Ramanathaswamy Temple corridors', 'Pamban Bridge', 'Dhanushkodi', 'APJ Abdul Kalam Memorial'], bestMonths: 'Oct–Apr', cost: 'low', veg: 'high' },
  { name: 'Kanyakumari', state: 'Tamil Nadu', airport: { code: 'TRV', name: 'Thiruvananthapuram', hours: 2.5 }, areas: ['Sunrise Point'], sights: ['Vivekananda Rock Memorial', 'Thiruvalluvar Statue', 'Sunrise & sunset at the tip', 'Padmanabhapuram Palace'], bestMonths: 'Oct–Mar', cost: 'low' },
  { name: 'Tirupati', state: 'Andhra Pradesh', airport: { code: 'TIR', name: 'Tirupati', hours: 0.75 }, areas: ['Tirupati town', 'Tirumala'], sights: ['Sri Venkateswara Temple, Tirumala', 'Kapila Theertham', 'Sri Padmavathi Temple'], bestMonths: 'Sep–Feb', cost: 'low', veg: 'high' },
  { name: 'Hyderabad', state: 'Telangana', airport: { code: 'HYD', name: 'Hyderabad', hours: 0.75 }, areas: ['Banjara Hills', 'Charminar area'], sights: ['Charminar & Laad Bazaar', 'Golconda Fort', 'Chowmahalla Palace', 'Salar Jung Museum'], bestMonths: 'Oct–Feb', cost: 'mid' },
  { name: 'Alleppey', aliases: ['alappuzha', 'alleppey backwaters', 'kumarakom'], state: 'Kerala', airport: { code: 'COK', name: 'Kochi', hours: 1.75 }, rail: { name: 'Alappuzha', hours: 0.2 }, areas: ['Punnamada', 'Alappuzha Beach', 'Kainakary'], sights: ['Houseboat cruise on Vembanad Lake', 'Alappuzha Beach', 'Marari Beach', 'Kuttanad backwaters by canoe', 'Pathiramanal Island'], bestMonths: 'Sep–Mar', cost: 'mid' },
  { name: 'Kochi', aliases: ['fort kochi', 'cochin', 'ernakulam'], state: 'Kerala', airport: { code: 'COK', name: 'Kochi', hours: 1.25 }, rail: { name: 'Ernakulam Junction', hours: 0.5 }, areas: ['Fort Kochi', 'Mattancherry', 'Ernakulam (MG Road)'], sights: ['Chinese fishing nets, Fort Kochi', 'Mattancherry Palace', 'Paradesi Synagogue', 'St. Francis Church, Fort Kochi', 'Kerala Kathakali Centre'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Wayanad', state: 'Kerala', airport: { code: 'CCJ', name: 'Kozhikode', hours: 2.5 }, rail: { name: 'Kozhikode', hours: 2.5 }, areas: ['Kalpetta', 'Vythiri', 'Sulthan Bathery'], sights: ['Edakkal Caves', 'Banasura Sagar Dam', 'Chembra Peak', 'Pookode Lake', 'Soochipara Falls'], bestMonths: 'Oct–May', cost: 'mid' },
  { name: 'Thekkady', aliases: ['kumily', 'periyar'], state: 'Kerala', airport: { code: 'IXM', name: 'Madurai', hours: 3.5 }, areas: ['Kumily', 'Thekkady Lake Road'], sights: ['Periyar Tiger Reserve boat ride', 'Spice plantation walk', 'Periyar bamboo rafting', 'Kalaripayattu show', 'Chellarkovil viewpoint'], bestMonths: 'Oct–Mar', cost: 'mid' },
  { name: 'Kovalam', state: 'Kerala', airport: { code: 'TRV', name: 'Thiruvananthapuram', hours: 0.5 }, areas: ['Lighthouse Beach', 'Hawa Beach', 'Samudra Beach'], sights: ['Lighthouse Beach', 'Vizhinjam Lighthouse', 'Hawa Beach', 'Poovar backwaters', 'Padmanabhaswamy Temple, Thiruvananthapuram'], bestMonths: 'Sep–Mar', cost: 'mid' },
  { name: 'Varkala', state: 'Kerala', airport: { code: 'TRV', name: 'Thiruvananthapuram', hours: 1.25 }, areas: ['North Cliff', 'Papanasam'], sights: ['Varkala Cliff', 'Papanasam Beach', 'Janardana Swamy Temple', 'Kappil backwaters'], bestMonths: 'Oct–Mar', cost: 'mid' },
  // East & North-East
  { name: 'Darjeeling', state: 'West Bengal', airport: { code: 'IXB', name: 'Bagdogra', hours: 3 }, areas: ['Mall Road (Chowrasta)', 'Ghoom'], sights: ['Tiger Hill sunrise', 'Darjeeling Himalayan Railway', 'Batasia Loop', 'Happy Valley Tea Estate'], bestMonths: 'Mar–May, Oct–Dec', cost: 'mid' },
  { name: 'Gangtok', state: 'Sikkim', airport: { code: 'IXB', name: 'Bagdogra', hours: 4 }, areas: ['MG Marg'], sights: ['MG Marg', 'Tsomgo Lake', 'Rumtek Monastery', 'Nathula Pass (permit)'], bestMonths: 'Mar–May, Oct–Dec', cost: 'mid' },
  { name: 'Shillong', state: 'Meghalaya', airport: { code: 'GAU', name: 'Guwahati', hours: 3 }, areas: ['Police Bazaar', 'Laitumkhrah'], sights: ['Umiam Lake', 'Elephant Falls', 'Shillong Peak', 'Day trip to Cherrapunji'], bestMonths: 'Oct–May', cost: 'mid' },
  { name: 'Cherrapunji', aliases: ['sohra'], state: 'Meghalaya', airport: { code: 'GAU', name: 'Guwahati', hours: 4 }, areas: ['Sohra'], sights: ['Double-decker living root bridge (Nongriat)', 'Nohkalikai Falls', 'Mawsmai Cave', 'Seven Sisters Falls'], bestMonths: 'Oct–May', cost: 'mid' },
  { name: 'Tawang', state: 'Arunachal Pradesh', airport: { code: 'TEZ', name: 'Tezpur', hours: 9 }, areas: ['Tawang town'], sights: ['Tawang Monastery', 'Sela Pass', 'Madhuri (Sangetsar) Lake', 'Jaswant Garh War Memorial'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'mid' },
  { name: 'Kaziranga', state: 'Assam', airport: { code: 'JRH', name: 'Jorhat', hours: 2 }, areas: ['Kohora'], sights: ['Jeep safari (Central range)', 'Elephant safari', 'Tea garden walk'], bestMonths: 'Nov–Apr', cost: 'mid' },
  { name: 'Majuli', state: 'Assam', airport: { code: 'JRH', name: 'Jorhat', hours: 3 }, areas: ['Garamur', 'Kamalabari'], sights: ['Ferry across the Brahmaputra', 'Satras (Vaishnavite monasteries)', 'Mask-making at Samaguri', 'Mising village walk'], bestMonths: 'Oct–Mar', cost: 'low' },
  { name: 'Puri', state: 'Odisha', airport: { code: 'BBI', name: 'Bhubaneswar', hours: 1.5 }, areas: ['Swargadwar beach', 'Chakratirtha Road'], sights: ['Jagannath Temple (outside view for non-Hindus)', 'Puri Beach', 'Konark Sun Temple', 'Chilika Lake'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Kolkata', aliases: ['calcutta'], state: 'West Bengal', airport: { code: 'CCU', name: 'Kolkata', hours: 0.75 }, areas: ['Park Street', 'Esplanade'], sights: ['Victoria Memorial', 'Howrah Bridge & flower market', 'Kumartuli', 'College Street'], bestMonths: 'Oct–Feb', cost: 'mid' },
  // Islands
  { name: 'Andaman', aliases: ['port blair', 'andaman islands', 'andaman and nicobar'], state: 'Andaman & Nicobar Islands', airport: { code: 'IXZ', name: 'Port Blair', hours: 0.3 }, areas: ['Port Blair', 'Havelock (Swaraj Dweep)', 'Neil (Shaheed Dweep)'], sights: ['Cellular Jail light & sound show', 'Radhanagar Beach', 'Elephant Beach snorkelling', 'Ferry to Havelock'], bestMonths: 'Oct–May', cost: 'high' },
  { name: 'Havelock', aliases: ['swaraj dweep'], state: 'Andaman & Nicobar Islands', airport: { code: 'IXZ', name: 'Port Blair (+ ferry)', hours: 2.5 }, areas: ['Beach No. 3', 'Radhanagar'], sights: ['Radhanagar Beach', 'Elephant Beach', 'Kalapathar Beach', 'Scuba diving'], bestMonths: 'Oct–May', cost: 'high' },
  { name: 'Lakshadweep', aliases: ['agatti', 'bangaram'], state: 'Lakshadweep', airport: { code: 'AGX', name: 'Agatti', hours: 0.3 }, areas: ['Agatti', 'Bangaram'], sights: ['Lagoon snorkelling', 'Kayaking', 'Glass-bottom boat ride'], bestMonths: 'Oct–Apr', cost: 'high' },
  // Extra bases used by regional routes
  { name: 'Pahalgam', state: 'Jammu & Kashmir', airport: { code: 'SXR', name: 'Srinagar', hours: 2.5 }, areas: ['Pahalgam market', 'Lidder riverside'], sights: ['Betaab Valley', 'Aru Valley', 'Chandanwari', 'Lidder river walk'], bestMonths: 'Apr–Oct', cost: 'mid' },
  { name: 'Nubra', aliases: ['nubra valley', 'hunder', 'diskit'], state: 'Ladakh', airport: { code: 'IXL', name: 'Leh', hours: 5 }, areas: ['Hunder', 'Diskit'], sights: ['Khardung La pass', 'Diskit Monastery', 'Hunder sand dunes', 'Turtuk village'], bestMonths: 'Jun–Sep', cost: 'mid' },
  { name: 'Pangong', aliases: ['pangong lake', 'pangong tso'], state: 'Ladakh', airport: { code: 'IXL', name: 'Leh', hours: 5 }, areas: ['Spangmik lakeside camps'], sights: ['Pangong Tso shore at sunrise', 'Chang La pass', 'Hemis Monastery (on the way)'], bestMonths: 'Jun–Sep', cost: 'mid' },
  { name: 'Pelling', state: 'Sikkim', airport: { code: 'IXB', name: 'Bagdogra', hours: 5 }, areas: ['Upper Pelling'], sights: ['Kanchenjunga views at sunrise', 'Pemayangtse Monastery', 'Rabdentse ruins', 'Khecheopalri Lake'], bestMonths: 'Mar–May, Oct–Dec', cost: 'mid' },
  { name: 'Lachung', state: 'Sikkim', airport: { code: 'IXB', name: 'Bagdogra', hours: 9 }, areas: ['Lachung village'], sights: ['Yumthang Valley', 'Zero Point (season permitting)', 'Lachung Monastery'], bestMonths: 'Mar–Jun, Oct–Nov', cost: 'mid' },
  { name: 'Dawki', aliases: ['mawlynnong'], state: 'Meghalaya', airport: { code: 'GAU', name: 'Guwahati', hours: 5 }, areas: ['Shnongpdeng riverside'], sights: ['Umngot river boat ride', 'Mawlynnong village', 'Living root bridge at Riwai', 'Shnongpdeng camping'], bestMonths: 'Nov–Apr', cost: 'mid' },
  { name: 'Ahmedabad', state: 'Gujarat', airport: { code: 'AMD', name: 'Ahmedabad', hours: 0.5 }, areas: ['Old City', 'Navrangpura'], sights: ['Sabarmati Ashram', 'Old city heritage walk', 'Adalaj stepwell', 'Manek Chowk night food market'], bestMonths: 'Nov–Feb', cost: 'mid', veg: 'high' },
  { name: 'Orchha', state: 'Madhya Pradesh', airport: { code: 'GWL', name: 'Gwalior', hours: 3 }, areas: ['Orchha Fort area'], sights: ['Orchha Fort & Jahangir Mahal', 'Chaturbhuj Temple', 'Royal cenotaphs on the Betwa', 'Ram Raja Temple'], bestMonths: 'Oct–Mar', cost: 'low' },
  { name: 'Bhubaneswar', state: 'Odisha', airport: { code: 'BBI', name: 'Bhubaneswar', hours: 0.5 }, areas: ['Old Town', 'Saheed Nagar'], sights: ['Lingaraj Temple', 'Mukteshwar Temple', 'Udayagiri & Khandagiri caves', 'Odisha State Museum'], bestMonths: 'Oct–Mar', cost: 'low', veg: 'high' },
  { name: 'Dirang', state: 'Arunachal Pradesh', airport: { code: 'TEZ', name: 'Tezpur', hours: 6 }, areas: ['Dirang valley'], sights: ['Dirang Dzong', 'Sangti Valley', 'Hot water springs', 'Kiwi & apple orchards'], bestMonths: 'Mar–Jun, Sep–Nov', cost: 'mid' }
];

const COST_LEVELS: Record<CostLevel, DestinationProfile['typicalDailyCostPerPersonINR']> = {
  low: { stay: { budget: 900, mid: 1800, premium: 4200 }, food: 600, localTransport: 400, activities: 300 },
  mid: { stay: { budget: 1300, mid: 2600, premium: 6000 }, food: 750, localTransport: 550, activities: 450 },
  high: { stay: { budget: 2000, mid: 3800, premium: 8500 }, food: 950, localTransport: 750, activities: 700 }
};

export function findIndiaPlace(text: string): PlaceRef | null {
  const t = (text || '').toLowerCase().replace(/,\s*india$/, '').trim();
  if (!t) return null;
  return (
    INDIA_PLACES.find((p) => p.name.toLowerCase() === t || (p.aliases || []).includes(t)) ||
    INDIA_PLACES.find((p) => t.startsWith(p.name.toLowerCase()) || (p.aliases || []).some((a) => t.startsWith(a))) ||
    null
  );
}

/**
 * A plan-ready profile for any Indian place, without calling the AI.
 * Known places get real airports, areas and sights; unknown places get honest generic
 * placeholders ("check on Google Maps") and mid-level price estimates.
 */
export function buildFallbackProfile(destination: string): DestinationProfile {
  const ref = findIndiaPlace(destination);
  const display = ref?.name || (destination || 'Your destination').replace(/,\s*India$/i, '').trim();
  const level = COST_LEVELS[ref?.cost || 'mid'];
  return {
    name: display,
    state: ref?.state || '',
    isInIndia: true,
    nearestAirports: ref?.airport ? [{ code: ref.airport.code, name: ref.airport.name, driveHoursToCenter: ref.airport.hours }] : [],
    nearestRailway: ref?.rail ? { name: ref.rail.name, driveHoursToCenter: ref.rail.hours } : null,
    stayAreas: (ref?.areas.length ? ref.areas : [`Central ${display}`]).slice(0, 3).map((name, i) => ({
      name,
      whyStayHere: i === 0 ? 'Close to the main sights and places to eat' : 'A quieter base with easy access',
      priceLevel: (['mid', 'budget', 'premium'] as const)[i % 3]
    })),
    topSights: (ref?.sights.length ? ref.sights : [`Main sights of ${display} (check Google Maps)`, `${display} local market`, `${display} viewpoint or waterfront`]).map((name) => ({
      name,
      area: ref?.areas[0] || display,
      hoursNeeded: 2.5
    })),
    typicalDailyCostPerPersonINR: level,
    bestMonths: ref?.bestMonths || 'Check local weather before you go',
    weatherNote: ref ? `Best time: ${ref.bestMonths}.` : 'We don’t have a guide for this place yet — check weather and routes before you book.',
    localTips: [
      'Prices here are rough estimates — confirm on the booking site.',
      ref?.airport ? `Nearest airport: ${ref.airport.name} (${ref.airport.code}), about ${ref.airport.hours} h away.` : 'Check the nearest airport or railway station before you book.',
      'Keep some cash for local transport and small shops.'
    ],
    vegFriendly: ref?.veg || 'medium',
    isOfflineEstimate: true
  };
}
