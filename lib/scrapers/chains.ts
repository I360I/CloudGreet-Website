/**
 * National / regional chain + franchise denylist for the lead scraper.
 *
 * CloudGreet sells an AI receptionist to INDEPENDENT local businesses. A
 * corporate-owned McDonald's, a Wendy's franchisee, or a Roto-Rooter
 * territory never controls its own phone line - those are dead leads that
 * make a rep's list look junk. Rating filters don't catch them (a chain
 * often sits at 3.1-3.4 stars, which passes a "below par" ceiling), so we
 * match on the business NAME instead.
 *
 * Matching is whole-word on a normalized name (lowercased, punctuation ->
 * spaces), so "McDonald's", "Sonic Drive-In", and "A&W Restaurant" all hit
 * while a local "Gwendy's Cafe" or "Cookout Catering Co" does not.
 */

// Tokens are stored pre-normalized (lowercase, alphanumerics + single
// spaces). Multi-word tokens must match as a contiguous word sequence.
const CHAIN_TOKENS: string[] = [
  // Burgers / QSR
  'mcdonald', 'burger king', 'wendy', 'jack in the box', 'sonic drive', 'checkers',
  'rally', 'krystal', 'cook out', 'white castle', 'hardee', 'carl s jr', 'in n out',
  'five guys', 'shake shack', 'smashburger', 'fatburger', 'steak n shake', 'freddy s',
  'culver', 'whataburger', 'a w', 'backyard burger',
  // Chicken
  'kfc', 'kentucky fried', 'popeyes', 'chick fil a', 'raising cane', 'zaxby',
  'bojangles', 'church s chicken', 'wingstop', 'buffalo wild wings', 'el pollo loco',
  'slim chickens',
  // Mexican
  'taco bell', 'chipotle', 'qdoba', 'del taco', 'moe s southwest', 'taco john',
  'taco bueno', 'rubio', 'baja fresh', 'on the border', 'taco cabana',
  // Pizza
  'domino', 'pizza hut', 'papa john', 'little caesar', 'papa murphy', 'marco s pizza',
  'round table pizza', 'jet s pizza', 'hungry howie', 'cicis', 'ci ci s', 'blaze pizza',
  'mod pizza', 'godfather s pizza', 'rosati', 'sbarro',
  // Sandwiches / subs
  'subway', 'jimmy john', 'jersey mike', 'firehouse subs', 'quiznos', 'which wich',
  'potbelly', 'mcalister', 'jason s deli', 'schlotzsky',
  // Coffee / bakery / dessert
  'starbucks', 'dunkin', 'krispy kreme', 'tim hortons', 'panera', 'einstein bros',
  'auntie anne', 'cinnabon', 'baskin robbins', 'cold stone', 'dairy queen', 'menchie',
  'jamba', 'smoothie king', 'tropical smoothie', 'biggby',
  // Casual dining
  'applebee', 'chili s', 'olive garden', 'red lobster', 'outback', 'tgi friday',
  'ihop', 'denny s', 'waffle house', 'cracker barrel', 'texas roadhouse',
  'longhorn steakhouse', 'red robin', 'ruby tuesday', 'cheesecake factory',
  'p f chang', 'pf chang', 'panda express', 'golden corral', 'hooters', 'cheddar',
  'carrabba', 'bonefish grill', 'perkins', 'bob evans', 'village inn', 'friendly s',
  'marie callender', 'chuck e cheese', 'dave buster', 'twin peaks', 'logan s roadhouse',
  // Convenience / gas that surface as restaurants
  'wawa', 'sheetz', 'quiktrip', 'quik trip', 'casey s general', '7 eleven',
  'seven eleven', 'circle k', 'buc ee', 'royal farms', 'kwik trip', 'kwik star',
  'speedway', 'racetrac', 'pilot flying j',
  // Service / contractor franchises
  'roto rooter', 'mr rooter', 'mr handyman', 'benjamin franklin plumbing',
  'one hour heating', 'one hour air', 'aire serv', 'mr electric', 'rescue rooter',
  'home depot', 'lowe s', 'servpro', 'servicemaster', 'stanley steemer',
  'the grounds guys', 'trugreen', 'true green', 'lawn doctor', 'weed man',
  'molly maid', 'merry maids', 'two men and a truck', 'got junk', 'college hunks',
  'budget blinds', 'window world', 'renewal by andersen',
]

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// One alternation regex, matched with word boundaries against the
// normalized name. Built once at module load.
const CHAIN_RE = new RegExp(
  '\\b(' + CHAIN_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
)

/** True if the business name looks like a national/regional chain or franchise. */
export function isChainBusiness(name?: string | null): boolean {
  if (!name) return false
  return CHAIN_RE.test(normalizeName(name))
}
