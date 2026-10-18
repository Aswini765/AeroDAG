/**
 * AeroDAG Deterministic Mock Activity Provider
 * 
 * Generates curated, category-tagged activities tailored to traveller demographics,
 * child ages, walking intensities, and destinations.
 * Supports: Beach, Nature, Culture, Sightseeing, Food, Shopping, Adventure, Relaxation.
 */

import { ActivityItem } from '../../types/travelBooking';
import {
  ActivityProvider,
  ActivitySearchParams,
  ActivityOption,
  ProviderCapabilities,
  ProviderHealthStatus
} from './types';
import { normalizeActivity } from './normalizers';

export class MockActivityProvider implements ActivityProvider {
  public readonly providerName = 'MockActivityProvider';
  public readonly category = 'activities' as const;
  public readonly isLive = false;
  public readonly supportsBooking = false;
  public readonly capabilities: ProviderCapabilities = {
    search: true,
    availability: true,
    pricing: true,
    booking: false,
    domestic: true,
    international: true
  };

  async searchActivityOptions(params: ActivitySearchParams): Promise<ActivityOption[]> {
    const activities = await this.searchActivities(params);
    return activities.map(a => normalizeActivity(a, this.providerName, true));
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      providerName: this.providerName,
      category: this.category,
      state: 'available',
      latencyMs: 10,
      lastChecked: new Date().toISOString(),
      details: 'Deterministic mock activities database active'
    };
  }

  async searchActivities(params: ActivitySearchParams): Promise<ActivityItem[]> {
    const dest = (params.destination || '').toLowerCase();
    const hasKids = (params.childAges && params.childAges.length > 0);
    const hasSeniors = params.hasSeniors || params.walkingPreference === 'Low';

    let activities: ActivityItem[] = [];

    if (dest.includes('coorg')) {
      activities = [
        {
          id: 'act-coorg-1',
          name: 'Abbey Falls & Coffee Plantation Walking Tour',
          category: 'Nature',
          location: 'Madikeri, Coorg',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 600,
          walkingLevel: 'Low',
          description: 'Scenic plantation walk surrounded by spice vines and roaring Abbey Falls.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-coorg-2',
          name: 'Dubare Elephant Camp & River Experience',
          category: 'Nature',
          location: 'Kushalnagar, Coorg',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 900,
          walkingLevel: 'Low',
          description: 'Peaceful Cauvery riverbank elephant interaction and gentle boat crossing.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-coorg-3',
          name: 'Raja\'s Seat Panoramic Sunset & Musical Fountain',
          category: 'Sightseeing',
          location: 'Madikeri, Coorg',
          duration: '1.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 400,
          walkingLevel: 'Low',
          description: 'Panoramic sunset views across Western Ghat valleys from Raja\'s Seat.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-coorg-4',
          name: 'Namdroling Monastery (Golden Temple) & Tibetan Handicrafts',
          category: 'Culture',
          location: 'Bylakuppe, Coorg',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 500,
          walkingLevel: 'Low',
          description: 'Visit the magnificent 40-foot gilded Buddha statues and explore traditional Tibetan art and craft stalls.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-coorg-5',
          name: 'Talacauvery & Brahmagiri Hills Viewpoint',
          category: 'Nature',
          location: 'Bhagamandala, Coorg',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 700,
          walkingLevel: 'Low',
          description: 'Sacred birthplace of River Cauvery with breathtaking panoramic views of mist-covered Western Ghat ranges.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-coorg-6',
          name: 'Madikeri Fort & Heritage Museum Walk',
          category: 'Culture',
          location: 'Madikeri, Coorg',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 400,
          walkingLevel: 'Low',
          description: 'Historical 17th-century fort palace, stone ramparts, and museum showcasing Kodava weapons and royal history.',
          timeSlot: 'Afternoon',
          isIncluded: true
        }
      ];
    } else if (dest.includes('kerala') || dest.includes('munnar')) {
      activities = [
        {
          id: 'act-ker-1',
          name: 'Munnar Tea Museum & Gentle Garden Walk',
          category: 'Culture',
          location: 'Munnar',
          duration: '2 Hours',
          ageSuitability: 'Senior-Friendly (Ground Floor)',
          minAge: 0,
          estimatedPriceINR: 600,
          walkingLevel: 'Low',
          description: 'Tea processing demonstration with zero stairs and fresh cardamom tea tasting.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-ker-2',
          name: 'Alleppey Shaded Backwater Country Boat Cruise',
          category: 'Relaxation',
          location: 'Alleppey',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1200,
          walkingLevel: 'Low',
          description: 'Tranquil shaded boat ride along serene canal waterways with coconut water refreshments.',
          timeSlot: 'Afternoon',
          isIncluded: true
        },
        {
          id: 'act-ker-3',
          name: 'Eravikulam National Park Nilgiri Tahr Safari',
          category: 'Nature',
          location: 'Rajamalai, Munnar',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 800,
          walkingLevel: 'Low',
          description: 'Scenic park safari bus ride through rolling mist grasslands to spot endangered Nilgiri Tahr mountain goats.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-ker-4',
          name: 'Mattupetty Dam & Eco Point Lake Boating',
          category: 'Sightseeing',
          location: 'Mattupetty, Munnar',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 650,
          walkingLevel: 'Low',
          description: 'Serene mountain reservoir boat cruise surrounded by tea estates, eucalyptus forests, and famous natural echo phenomenon.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-ker-5',
          name: 'Marayoor Sandalwood Forest & Dolmens Heritage Walk',
          category: 'Culture',
          location: 'Marayoor, Munnar',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 750,
          walkingLevel: 'Low',
          description: 'Natural aromatic sandalwood reserve and prehistoric megalithic stone dolmens with ancient rock paintings.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-ker-6',
          name: 'Punarjani Traditional Kathakali & Martial Arts Show',
          category: 'Culture',
          location: 'Pallivasal, Munnar',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 500,
          walkingLevel: 'Low',
          description: 'Spellbinding performance of classical Kerala Kathakali mudras, colorful facial makeup, and ancient Kalaripayattu martial arts.',
          timeSlot: 'Evening',
          isIncluded: true
        }
      ];
    } else if (dest.includes('mysuru') || dest.includes('mysore')) {
      activities = [
        {
          id: 'act-mys-1',
          name: 'Mysore Palace Guided Heritage Walk',
          category: 'Culture',
          location: 'Mysuru',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 400,
          walkingLevel: 'Low',
          description: 'Explore the grand Durbar hall, stained glass ceilings, and royal courtyards.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-mys-2',
          name: 'Chamundi Hills & Devaraja Market Tasting',
          category: 'Food',
          location: 'Mysuru',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 400,
          walkingLevel: 'Low',
          description: 'Panoramic city vista followed by famous melt-in-mouth Mysore Pak tasting.',
          timeSlot: 'Afternoon',
          isIncluded: true
        },
        {
          id: 'act-mys-3',
          name: 'Brindavan Gardens Musical Fountain & Illumination',
          category: 'Sightseeing',
          location: 'KRS Dam, Mysuru',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 500,
          walkingLevel: 'Low',
          description: 'Terraced ornamental gardens and synchronized evening musical fountain illumination show along the Cauvery river.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-mys-4',
          name: 'St. Philomena\'s Cathedral & Artisan Silk Weaving Tour',
          category: 'Culture',
          location: 'Central Mysuru',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 350,
          walkingLevel: 'Low',
          description: 'Magnificent Neo-Gothic twin spires cathedral followed by live demonstration of pure Mysore mulberry silk weaving.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-mys-5',
          name: 'Ranganathittu Bird Sanctuary Gentle Boat Safari',
          category: 'Nature',
          location: 'Srirangapatna, Mysuru',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 600,
          walkingLevel: 'Low',
          description: 'Ranger-guided rowboat safari navigating river islets to observe nesting painted storks, spoonbills, and marsh mugger crocodiles.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-mys-6',
          name: 'Jaganmohan Palace Art Gallery & Royal Artifacts',
          category: 'Culture',
          location: 'Mysuru',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 350,
          walkingLevel: 'Low',
          description: 'Historic royal residence housing Raja Ravi Varma oil masterpieces, antique musical clocks, and sandalwood carvings.',
          timeSlot: 'Afternoon',
          isIncluded: true
        }
      ];
    } else if (dest.includes('goa')) {
      activities = [
        {
          id: 'act-goa-1',
          name: 'Calangute & Baga Sunset Family Promenade',
          category: 'Beach',
          location: 'North Goa',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages (Family-Friendly)',
          minAge: 0,
          estimatedPriceINR: 500,
          walkingLevel: 'Low',
          description: 'Gentle seaside promenade with sunset photography, gentle sandy shallows, and beachfront shack refreshments.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-goa-2',
          name: 'Mandovi River Scenic Evening Cruise',
          category: 'Relaxation',
          location: 'Panaji',
          duration: '1.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1200,
          walkingLevel: 'Low',
          description: 'Shaded double-decker boat cruise featuring Goan folk dance performances, live music, and scenic river breezes.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-goa-3',
          name: 'UNESCO Basilica of Bom Jesus & Old Goa Heritage',
          category: 'Culture',
          location: 'Old Goa',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 5,
          estimatedPriceINR: 400,
          walkingLevel: hasSeniors ? 'Low' : 'Moderate',
          description: 'Historic 16th-century Portuguese cathedral with shaded courtyards and easy ramp accessibility.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-goa-4',
          name: 'Sahakari Organic Spice Plantation & Elephant Wash',
          category: 'Nature',
          location: 'Ponda',
          duration: '3.5 Hours',
          ageSuitability: 'Kids & Families (4+)',
          minAge: 4,
          estimatedPriceINR: 1800,
          walkingLevel: 'Low',
          description: 'Guided sensory walking tour through vanilla, cardamom, and cinnamon groves followed by a traditional buffet lunch served on banana leaves.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-goa-5',
          name: 'Dudhsagar Waterfalls Jeep Safari',
          category: 'Adventure',
          location: 'Mollem National Park',
          duration: '5 Hours',
          ageSuitability: 'Ages 8+ (Active)',
          minAge: 8,
          estimatedPriceINR: 3200,
          walkingLevel: 'Moderate',
          description: 'Thrilling open-top 4x4 jungle safari crossing forest streams to reach the base of Dudhsagar waterfalls.',
          timeSlot: 'Morning',
          isIncluded: false
        },
        {
          id: 'act-goa-6',
          name: 'Anjuna Flea Market & Artisan Souvenirs',
          category: 'Shopping',
          location: 'Anjuna',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 800,
          walkingLevel: 'Moderate',
          description: 'Vibrant outdoor market featuring handmade crafts, Goan spices, cashew nuts, and beachwear.',
          timeSlot: 'Afternoon',
          isIncluded: false
        }
      ];
    } else if (dest.includes('vietnam')) {
      activities = [
        {
          id: 'act-vn-1',
          name: 'Halong Bay Emerald Cruise & Titop Island Cave Walk',
          category: 'Nature',
          location: 'Halong Bay',
          duration: '6 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 3500,
          walkingLevel: 'Low',
          description: 'Scenic cruise along limestone karsts, emerald waters, and gentle sheltered kayaking or bamboo boat rides.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-vn-2',
          name: 'Hanoi Old Quarter Cyclo Tour & Water Puppet Show',
          category: 'Culture',
          location: 'Hanoi',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages (Kids loved)',
          minAge: 3,
          estimatedPriceINR: 1500,
          walkingLevel: 'Low',
          description: 'Traditional pedal-powered cyclo ride through the 36 guild streets followed by VIP tickets to Thang Long Water Puppet Theatre.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-vn-3',
          name: 'Trang An Grottoes & Ninh Binh Riverboat Exploration',
          category: 'Sightseeing',
          location: 'Ninh Binh',
          duration: '4 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 2200,
          walkingLevel: 'Low',
          description: 'UNESCO World Heritage boat row through limestone karst caves and peaceful river valleys.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-vn-4',
          name: 'Hanoi Street Food Walking Discovery (Kid & Senior Safe)',
          category: 'Food',
          location: 'Hoan Kiem',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 5,
          estimatedPriceINR: 1800,
          walkingLevel: 'Low',
          description: 'Taste authentic Banh Mi, fresh mango rolls, egg coffee, and sweet coconut soup at hygienic local heritage eateries.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-vn-5',
          name: 'Sun World Ba Na Hills & Golden Giant Hands Bridge',
          category: 'Adventure',
          location: 'Da Nang',
          duration: '5 Hours',
          ageSuitability: 'Family (5+)',
          minAge: 5,
          estimatedPriceINR: 4200,
          walkingLevel: 'Moderate',
          description: 'World-record cable car journey into the misty mountains to walk across the iconic Golden Bridge held by stone hands.',
          timeSlot: 'Morning',
          isIncluded: false
        }
      ];
    } else if (dest.includes('singapore')) {
      activities = [
        {
          id: 'act-sg-1',
          name: 'Gardens by the Bay: Flower Dome & Supertree Light Show',
          category: 'Sightseeing',
          location: 'Marina Bay',
          duration: '3 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 2800,
          walkingLevel: 'Low',
          description: 'Climate-controlled futuristic domes with exotic flora and magical evening Garden Rhapsody synchronized music & light show.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-sg-2',
          name: 'Singapore Night Safari Tram & Wildlife Encounter',
          category: 'Nature',
          location: 'Mandai',
          duration: '3.5 Hours',
          ageSuitability: 'Family (4+)',
          minAge: 4,
          estimatedPriceINR: 3400,
          walkingLevel: 'Low',
          description: 'The world\'s first nocturnal zoo: 40-minute guided tram journey through secondary rainforest habitats.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-sg-3',
          name: 'Sentosa Island Cable Car & S.E.A. Aquarium',
          category: 'Beach',
          location: 'Sentosa',
          duration: '4 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 3600,
          walkingLevel: 'Low',
          description: 'Scenic aerial cable car into Sentosa followed by exploring 100,000 marine animals across 1,000 species.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-sg-4',
          name: 'Chinatown Heritage & Little India Spice Trail',
          category: 'Culture',
          location: 'Downtown',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 600,
          walkingLevel: 'Moderate',
          description: 'Discover Buddha Tooth Relic Temple, Sri Mariamman Temple, and vibrant Indian textile arcades.',
          timeSlot: 'Afternoon',
          isIncluded: true
        },
        {
          id: 'act-sg-5',
          name: 'Marina Bay Sands SkyPark Observation Deck',
          category: 'Sightseeing',
          location: 'Bayfront',
          duration: '1.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1900,
          walkingLevel: 'Low',
          description: 'Panoramic 360-degree vistas of Singapore straits and city skyline from the 57th floor.',
          timeSlot: 'Afternoon',
          isIncluded: false
        }
      ];
    } else if (dest.includes('thailand')) {
      activities = [
        {
          id: 'act-th-1',
          name: 'Chao Phraya River Scenic Longtail Boat & Wat Arun',
          category: 'Culture',
          location: 'Bangkok',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1800,
          walkingLevel: 'Low',
          description: 'Gentle river cruise with views of porcelain-encrusted Wat Arun and Bangkok riverside heritage houses.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-th-2',
          name: 'Phuket Phang Nga Bay & James Bond Island Boat Cruise',
          category: 'Nature',
          location: 'Phang Nga',
          duration: '6 Hours',
          ageSuitability: 'Family (5+)',
          minAge: 5,
          estimatedPriceINR: 3800,
          walkingLevel: 'Low',
          description: 'Cruising through towering limestone cliffs, sea caves, and floating Panyee village.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-th-3',
          name: 'Grand Palace & Emerald Buddha Guided Tour',
          category: 'Culture',
          location: 'Old Bangkok',
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 2200,
          walkingLevel: hasSeniors ? 'Low' : 'Moderate',
          description: 'Marvel at golden stupas, Thai royal throne halls, and the sacred jade Emerald Buddha.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-th-4',
          name: 'Damnoen Saduak Floating Market & Coconut Farm',
          category: 'Food',
          location: 'Ratchaburi',
          duration: '3.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 2000,
          walkingLevel: 'Low',
          description: 'Paddle past wooden market boats laden with fresh mangoes, coconut ice cream, and pad thai.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-th-5',
          name: 'Kata Beach Gentle Sunset Family Catamaran',
          category: 'Beach',
          location: 'Phuket',
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 2500,
          walkingLevel: 'Low',
          description: 'Relaxed catamaran cruise along Phuket’s west coast with refreshing fruit platters and sunset views.',
          timeSlot: 'Evening',
          isIncluded: true
        }
      ];
    } else {
      // General dynamic activities
      activities = [
        {
          id: 'act-gen-1',
          name: `${params.destination} Historic Quarter & Landmark Tour`,
          category: 'Sightseeing',
          location: params.destination,
          duration: '2.5 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1000,
          walkingLevel: 'Low',
          description: 'Guided tour of prominent heritage monuments, public squares, and local photo spots.',
          timeSlot: 'Morning',
          isIncluded: true
        },
        {
          id: 'act-gen-2',
          name: `${params.destination} Scenic Waterfront & Sunset Walk`,
          category: 'Relaxation',
          location: params.destination,
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 600,
          walkingLevel: 'Low',
          description: 'Relaxed stroll along scenic vantage points with evening refreshments.',
          timeSlot: 'Evening',
          isIncluded: true
        },
        {
          id: 'act-gen-3',
          name: 'Regional Artisan Market & Local Culinary Tasting',
          category: 'Food',
          location: params.destination,
          duration: '2 Hours',
          ageSuitability: 'All Ages',
          minAge: 0,
          estimatedPriceINR: 1200,
          walkingLevel: 'Moderate',
          description: 'Sample authentic regional delicacies and shop for handcrafted souvenirs.',
          timeSlot: 'Afternoon',
          isIncluded: true
        }
      ];
    }

    // Apply family & senior intelligence
    return activities.map((act) => {
      let walking = act.walkingLevel;
      if (hasSeniors && walking === 'Moderate') {
        walking = 'Low'; // Pacing adjustment with shaded golf-cart / cyclo transport
      }
      return {
        ...act,
        walkingLevel: walking,
        source: 'sample' as const,
        sourceLabel: 'Sample data'
      };
    });
  }
}
