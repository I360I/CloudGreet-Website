/**
 * Top US metros by population with hardcoded centers. Used by the
 * Google-Places-backed trade sources to fan out beyond Texas when the
 * rep either types a non-TX city or leaves the location field blank.
 *
 * Keep keys lowercased; lookup strips trailing state suffixes ("austin
 * tx" -> "austin"). When two cities share a name (Springfield, Portland,
 * etc.) the entry with state-prefixed key wins; bare-city lookups fall
 * back to the most populous match.
 */

export type UsMetro = { name: string; state: string; lat: number; lng: number }

export const US_METROS: UsMetro[] = [
 // ---------- Texas (mirrors txCityCoords so a single lookup works) ----------
 { name: 'houston',         state: 'TX', lat: 29.7604, lng: -95.3698 },
 { name: 'san antonio',     state: 'TX', lat: 29.4241, lng: -98.4936 },
 { name: 'dallas',          state: 'TX', lat: 32.7767, lng: -96.7970 },
 { name: 'austin',          state: 'TX', lat: 30.2672, lng: -97.7431 },
 { name: 'fort worth',      state: 'TX', lat: 32.7555, lng: -97.3308 },
 { name: 'el paso',         state: 'TX', lat: 31.7619, lng: -106.4850 },
 { name: 'arlington',       state: 'TX', lat: 32.7357, lng: -97.1081 },
 { name: 'plano',           state: 'TX', lat: 33.0198, lng: -96.6989 },
 { name: 'corpus christi',  state: 'TX', lat: 27.8006, lng: -97.3964 },
 { name: 'lubbock',         state: 'TX', lat: 33.5779, lng: -101.8552 },

 // ---------- California ----------
 { name: 'los angeles',     state: 'CA', lat: 34.0522, lng: -118.2437 },
 { name: 'san diego',       state: 'CA', lat: 32.7157, lng: -117.1611 },
 { name: 'san jose',        state: 'CA', lat: 37.3382, lng: -121.8863 },
 { name: 'san francisco',   state: 'CA', lat: 37.7749, lng: -122.4194 },
 { name: 'fresno',          state: 'CA', lat: 36.7378, lng: -119.7871 },
 { name: 'sacramento',      state: 'CA', lat: 38.5816, lng: -121.4944 },
 { name: 'long beach',      state: 'CA', lat: 33.7701, lng: -118.1937 },
 { name: 'oakland',          state: 'CA', lat: 37.8044, lng: -122.2712 },
 { name: 'bakersfield',     state: 'CA', lat: 35.3733, lng: -119.0187 },
 { name: 'anaheim',         state: 'CA', lat: 33.8366, lng: -117.9143 },
 { name: 'riverside',       state: 'CA', lat: 33.9806, lng: -117.3755 },

 // ---------- Florida ----------
 { name: 'jacksonville',    state: 'FL', lat: 30.3322, lng: -81.6557 },
 { name: 'miami',           state: 'FL', lat: 25.7617, lng: -80.1918 },
 { name: 'tampa',           state: 'FL', lat: 27.9506, lng: -82.4572 },
 { name: 'orlando',         state: 'FL', lat: 28.5383, lng: -81.3792 },
 { name: 'st petersburg',   state: 'FL', lat: 27.7676, lng: -82.6403 },
 { name: 'fort lauderdale', state: 'FL', lat: 26.1224, lng: -80.1373 },
 { name: 'hialeah',         state: 'FL', lat: 25.8576, lng: -80.2781 },
 { name: 'tallahassee',     state: 'FL', lat: 30.4383, lng: -84.2807 },

 // ---------- New York ----------
 { name: 'new york',        state: 'NY', lat: 40.7128, lng: -74.0060 },
 { name: 'brooklyn',        state: 'NY', lat: 40.6782, lng: -73.9442 },
 { name: 'queens',          state: 'NY', lat: 40.7282, lng: -73.7949 },
 { name: 'buffalo',         state: 'NY', lat: 42.8864, lng: -78.8784 },
 { name: 'rochester',       state: 'NY', lat: 43.1566, lng: -77.6088 },

 // ---------- Illinois ----------
 { name: 'chicago',         state: 'IL', lat: 41.8781, lng: -87.6298 },
 { name: 'aurora',          state: 'IL', lat: 41.7606, lng: -88.3201 },
 { name: 'naperville',      state: 'IL', lat: 41.7508, lng: -88.1535 },

 // ---------- Pennsylvania ----------
 { name: 'philadelphia',    state: 'PA', lat: 39.9526, lng: -75.1652 },
 { name: 'pittsburgh',      state: 'PA', lat: 40.4406, lng: -79.9959 },

 // ---------- Ohio ----------
 { name: 'columbus',        state: 'OH', lat: 39.9612, lng: -82.9988 },
 { name: 'cleveland',       state: 'OH', lat: 41.4993, lng: -81.6944 },
 { name: 'cincinnati',      state: 'OH', lat: 39.1031, lng: -84.5120 },

 // ---------- Georgia ----------
 { name: 'atlanta',         state: 'GA', lat: 33.7490, lng: -84.3880 },
 { name: 'augusta',         state: 'GA', lat: 33.4735, lng: -82.0105 },
 { name: 'savannah',        state: 'GA', lat: 32.0809, lng: -81.0912 },

 // ---------- North Carolina ----------
 { name: 'charlotte',       state: 'NC', lat: 35.2271, lng: -80.8431 },
 { name: 'raleigh',         state: 'NC', lat: 35.7796, lng: -78.6382 },
 { name: 'greensboro',      state: 'NC', lat: 36.0726, lng: -79.7920 },
 { name: 'durham',          state: 'NC', lat: 35.9940, lng: -78.8986 },

 // ---------- Arizona ----------
 { name: 'phoenix',         state: 'AZ', lat: 33.4484, lng: -112.0740 },
 { name: 'tucson',           state: 'AZ', lat: 32.2226, lng: -110.9747 },
 { name: 'mesa',            state: 'AZ', lat: 33.4152, lng: -111.8315 },
 { name: 'scottsdale',      state: 'AZ', lat: 33.4942, lng: -111.9261 },
 { name: 'gilbert',          state: 'AZ', lat: 33.3528, lng: -111.7890 },
 { name: 'chandler',        state: 'AZ', lat: 33.3062, lng: -111.8413 },

 // ---------- Washington ----------
 { name: 'seattle',         state: 'WA', lat: 47.6062, lng: -122.3321 },
 { name: 'spokane',         state: 'WA', lat: 47.6588, lng: -117.4260 },
 { name: 'tacoma',          state: 'WA', lat: 47.2529, lng: -122.4443 },

 // ---------- Massachusetts ----------
 { name: 'boston',          state: 'MA', lat: 42.3601, lng: -71.0589 },
 { name: 'worcester',       state: 'MA', lat: 42.2626, lng: -71.8023 },

 // ---------- Colorado ----------
 { name: 'denver',          state: 'CO', lat: 39.7392, lng: -104.9903 },
 { name: 'colorado springs', state: 'CO', lat: 38.8339, lng: -104.8214 },
 { name: 'aurora',          state: 'CO', lat: 39.7294, lng: -104.8319 }, // dup name; CA wins on bare lookup

 // ---------- Nevada ----------
 { name: 'las vegas',       state: 'NV', lat: 36.1699, lng: -115.1398 },
 { name: 'henderson',       state: 'NV', lat: 36.0395, lng: -114.9817 },
 { name: 'reno',            state: 'NV', lat: 39.5296, lng: -119.8138 },

 // ---------- Other top metros ----------
 { name: 'detroit',         state: 'MI', lat: 42.3314, lng: -83.0458 },
 { name: 'minneapolis',     state: 'MN', lat: 44.9778, lng: -93.2650 },
 { name: 'st paul',         state: 'MN', lat: 44.9537, lng: -93.0900 },
 { name: 'st louis',        state: 'MO', lat: 38.6270, lng: -90.1994 },
 { name: 'kansas city',     state: 'MO', lat: 39.0997, lng: -94.5786 },
 { name: 'milwaukee',       state: 'WI', lat: 43.0389, lng: -87.9065 },
 { name: 'baltimore',       state: 'MD', lat: 39.2904, lng: -76.6122 },
 { name: 'washington',      state: 'DC', lat: 38.9072, lng: -77.0369 },
 { name: 'nashville',       state: 'TN', lat: 36.1627, lng: -86.7816 },
 { name: 'memphis',          state: 'TN', lat: 35.1495, lng: -90.0490 },
 { name: 'louisville',      state: 'KY', lat: 38.2527, lng: -85.7585 },
 { name: 'oklahoma city',   state: 'OK', lat: 35.4676, lng: -97.5164 },
 { name: 'tulsa',           state: 'OK', lat: 36.1540, lng: -95.9928 },
 { name: 'portland',        state: 'OR', lat: 45.5152, lng: -122.6784 },
 { name: 'salt lake city',  state: 'UT', lat: 40.7608, lng: -111.8910 },
 { name: 'omaha',           state: 'NE', lat: 41.2565, lng: -95.9345 },
 { name: 'indianapolis',    state: 'IN', lat: 39.7684, lng: -86.1581 },
 { name: 'new orleans',     state: 'LA', lat: 29.9511, lng: -90.0715 },
 { name: 'birmingham',      state: 'AL', lat: 33.5186, lng: -86.8104 },
 { name: 'albuquerque',     state: 'NM', lat: 35.0844, lng: -106.6504 },
]

const STATE_ABBRS = new Set([
 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
 'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
 'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
 'WI','WY','DC',
])

/**
 * Resolve "Phoenix" / "Phoenix AZ" / "phoenix, az" / "Aurora CO" to the
 * matching metro entry. When a state is given we prefer the exact match
 * for that state; without a state we return the first entry for the
 * city name (population-ordered above). Returns null when nothing
 * matches - caller should fall back to the national metro list.
 */
export function resolveUsMetro(raw: string): UsMetro | null {
 if (!raw) return null
 const cleaned = raw.trim().toLowerCase().replace(/[,]/g, '').replace(/\s+/g, ' ').trim()
 if (!cleaned) return null

 // Try "city state" suffix split first
 const tokens = cleaned.split(' ')
 const tail = tokens[tokens.length - 1].toUpperCase()
 if (tokens.length > 1 && STATE_ABBRS.has(tail)) {
  const cityName = tokens.slice(0, -1).join(' ')
  const exact = US_METROS.find((m) => m.name === cityName && m.state === tail)
  if (exact) return exact
 }

 // Try "spelled-out state" suffix - rare in input but cheap to support
 const fullStateMatch = cleaned.match(/(.+?)\s+(texas|california|florida|new york|illinois|pennsylvania|ohio|georgia|north carolina|arizona|washington|massachusetts|colorado|nevada|michigan|minnesota|missouri|wisconsin|maryland|tennessee|kentucky|oklahoma|oregon|utah|nebraska|indiana|louisiana|alabama|new mexico)$/i)
 if (fullStateMatch) {
  const cityName = fullStateMatch[1].trim()
  const stateName = fullStateMatch[2].toUpperCase()
  const stateAbbr = SPELLED_TO_ABBR[stateName] || ''
  const exact = US_METROS.find((m) => m.name === cityName && m.state === stateAbbr)
  if (exact) return exact
 }

 // Bare city - first match wins (most populous given list ordering)
 return US_METROS.find((m) => m.name === cleaned) || null
}

const SPELLED_TO_ABBR: Record<string, string> = {
 ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA',
 COLORADO: 'CO', CONNECTICUT: 'CT', DELAWARE: 'DE', FLORIDA: 'FL', GEORGIA: 'GA',
 ILLINOIS: 'IL', INDIANA: 'IN', IOWA: 'IA', KANSAS: 'KS', KENTUCKY: 'KY',
 LOUISIANA: 'LA', MARYLAND: 'MD', MASSACHUSETTS: 'MA', MICHIGAN: 'MI', MINNESOTA: 'MN',
 MISSISSIPPI: 'MS', MISSOURI: 'MO', MONTANA: 'MT', NEBRASKA: 'NE', NEVADA: 'NV',
 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
 'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', OHIO: 'OH', OKLAHOMA: 'OK',
 OREGON: 'OR', PENNSYLVANIA: 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
 'SOUTH DAKOTA': 'SD', TENNESSEE: 'TN', TEXAS: 'TX', UTAH: 'UT', VERMONT: 'VT',
 VIRGINIA: 'VA', WASHINGTON: 'WA', 'WEST VIRGINIA': 'WV', WISCONSIN: 'WI', WYOMING: 'WY',
}

/**
 * Default national fan-out - the top metros by population, deduplicated
 * by (name, state). Used when the rep leaves the location field blank.
 */
export const NATIONAL_FANOUT: UsMetro[] = [
 'new york-NY', 'los angeles-CA', 'chicago-IL', 'houston-TX', 'phoenix-AZ',
 'philadelphia-PA', 'san antonio-TX', 'san diego-CA', 'dallas-TX', 'austin-TX',
 'jacksonville-FL', 'fort worth-TX', 'columbus-OH', 'charlotte-NC', 'indianapolis-IN',
 'san francisco-CA', 'seattle-WA', 'denver-CO', 'washington-DC', 'boston-MA',
 'nashville-TN', 'el paso-TX', 'detroit-MI', 'oklahoma city-OK', 'portland-OR',
 'las vegas-NV', 'memphis-TN', 'louisville-KY', 'baltimore-MD', 'milwaukee-WI',
 'albuquerque-NM', 'tucson-AZ', 'fresno-CA', 'sacramento-CA', 'kansas city-MO',
 'atlanta-GA', 'miami-FL', 'tampa-FL', 'orlando-FL', 'minneapolis-MN',
].map((key) => {
 const [name, state] = key.split('-')
 return US_METROS.find((m) => m.name === name && m.state === state)!
}).filter(Boolean)
