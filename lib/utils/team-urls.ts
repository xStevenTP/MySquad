/**
 * Team Official Schedule URL Mappings
 * Maps team abbreviations to their official schedule pages
 */

type LeagueType = 'nba' | 'nfl' | 'mlb' | 'nhl' | 'lol' | 'csgo' | 'valorant' | 'dota2';

// NBA team URL mappings
const NBA_TEAM_URLS: Record<string, string> = {
  ATL: 'https://www.nba.com/hawks/schedule',
  BOS: 'https://www.nba.com/celtics/schedule',
  BKN: 'https://www.nba.com/nets/schedule',
  CHA: 'https://www.nba.com/hornets/schedule',
  CHI: 'https://www.nba.com/bulls/schedule',
  CLE: 'https://www.nba.com/cavaliers/schedule',
  DAL: 'https://www.nba.com/mavericks/schedule',
  DEN: 'https://www.nba.com/nuggets/schedule',
  DET: 'https://www.nba.com/pistons/schedule',
  GSW: 'https://www.nba.com/warriors/schedule',
  HOU: 'https://www.nba.com/rockets/schedule',
  IND: 'https://www.nba.com/pacers/schedule',
  LAC: 'https://www.nba.com/clippers/schedule',
  LAL: 'https://www.nba.com/lakers/schedule',
  MEM: 'https://www.nba.com/grizzlies/schedule',
  MIA: 'https://www.nba.com/heat/schedule',
  MIL: 'https://www.nba.com/bucks/schedule',
  MIN: 'https://www.nba.com/timberwolves/schedule',
  NOP: 'https://www.nba.com/pelicans/schedule',
  NYK: 'https://www.nba.com/knicks/schedule',
  OKC: 'https://www.nba.com/thunder/schedule',
  ORL: 'https://www.nba.com/magic/schedule',
  PHI: 'https://www.nba.com/sixers/schedule',
  PHX: 'https://www.nba.com/suns/schedule',
  POR: 'https://www.nba.com/blazers/schedule',
  SAC: 'https://www.nba.com/kings/schedule',
  SAS: 'https://www.nba.com/spurs/schedule',
  TOR: 'https://www.nba.com/raptors/schedule',
  UTA: 'https://www.nba.com/jazz/schedule',
  WAS: 'https://www.nba.com/wizards/schedule',
};

// NFL team URL mappings
const NFL_TEAM_URLS: Record<string, string> = {
  ARI: 'https://www.azcardinals.com/schedule/',
  ATL: 'https://www.atlantafalcons.com/schedule/',
  BAL: 'https://www.baltimoreravens.com/schedule/',
  BUF: 'https://www.buffalobills.com/schedule/',
  CAR: 'https://www.panthers.com/schedule/',
  CHI: 'https://www.chicagobears.com/schedule/',
  CIN: 'https://www.bengals.com/schedule/',
  CLE: 'https://www.clevelandbrowns.com/schedule/',
  DAL: 'https://www.dallascowboys.com/schedule/',
  DEN: 'https://www.denverbroncos.com/schedule/',
  DET: 'https://www.detroitlions.com/schedule/',
  GB: 'https://www.packers.com/schedule/',
  HOU: 'https://www.houstontexans.com/schedule/',
  IND: 'https://www.colts.com/schedule/',
  JAX: 'https://www.jaguars.com/schedule/',
  KC: 'https://www.chiefs.com/schedule/',
  LAC: 'https://www.chargers.com/schedule/',
  LAR: 'https://www.therams.com/schedule/',
  LV: 'https://www.raiders.com/schedule/',
  MIA: 'https://www.miamidolphins.com/schedule/',
  MIN: 'https://www.vikings.com/schedule/',
  NE: 'https://www.patriots.com/schedule/',
  NO: 'https://www.neworleanssaints.com/schedule/',
  NYG: 'https://www.giants.com/schedule/',
  NYJ: 'https://www.newyorkjets.com/schedule/',
  PHI: 'https://www.philadelphiaeagles.com/schedule/',
  PIT: 'https://www.steelers.com/schedule/',
  SEA: 'https://www.seahawks.com/schedule/',
  SF: 'https://www.49ers.com/schedule/',
  TB: 'https://www.buccaneers.com/schedule/',
  TEN: 'https://www.titansonline.com/schedule/',
  WAS: 'https://www.commanders.com/schedule/',
};

// MLB team URL mappings
const MLB_TEAM_URLS: Record<string, string> = {
  ARI: 'https://www.mlb.com/dbacks/schedule',
  ATL: 'https://www.mlb.com/braves/schedule',
  BAL: 'https://www.mlb.com/orioles/schedule',
  BOS: 'https://www.mlb.com/redsox/schedule',
  CHC: 'https://www.mlb.com/cubs/schedule',
  CHW: 'https://www.mlb.com/whitesox/schedule',
  CIN: 'https://www.mlb.com/reds/schedule',
  CLE: 'https://www.mlb.com/guardians/schedule',
  COL: 'https://www.mlb.com/rockies/schedule',
  DET: 'https://www.mlb.com/tigers/schedule',
  HOU: 'https://www.mlb.com/astros/schedule',
  KC: 'https://www.mlb.com/royals/schedule',
  LAA: 'https://www.mlb.com/angels/schedule',
  LAD: 'https://www.mlb.com/dodgers/schedule',
  MIA: 'https://www.mlb.com/marlins/schedule',
  MIL: 'https://www.mlb.com/brewers/schedule',
  MIN: 'https://www.mlb.com/twins/schedule',
  NYM: 'https://www.mlb.com/mets/schedule',
  NYY: 'https://www.mlb.com/yankees/schedule',
  OAK: 'https://www.mlb.com/athletics/schedule',
  PHI: 'https://www.mlb.com/phillies/schedule',
  PIT: 'https://www.mlb.com/pirates/schedule',
  SD: 'https://www.mlb.com/padres/schedule',
  SEA: 'https://www.mlb.com/mariners/schedule',
  SF: 'https://www.mlb.com/giants/schedule',
  STL: 'https://www.mlb.com/cardinals/schedule',
  TB: 'https://www.mlb.com/rays/schedule',
  TEX: 'https://www.mlb.com/rangers/schedule',
  TOR: 'https://www.mlb.com/bluejays/schedule',
  WSH: 'https://www.mlb.com/nationals/schedule',
};

// NHL team URL mappings
const NHL_TEAM_URLS: Record<string, string> = {
  ANA: 'https://www.nhl.com/ducks/schedule',
  ARI: 'https://www.nhl.com/coyotes/schedule',
  BOS: 'https://www.nhl.com/bruins/schedule',
  BUF: 'https://www.nhl.com/sabres/schedule',
  CAR: 'https://www.nhl.com/hurricanes/schedule',
  CBJ: 'https://www.nhl.com/bluejackets/schedule',
  CGY: 'https://www.nhl.com/flames/schedule',
  CHI: 'https://www.nhl.com/blackhawks/schedule',
  COL: 'https://www.nhl.com/avalanche/schedule',
  DAL: 'https://www.nhl.com/stars/schedule',
  DET: 'https://www.nhl.com/redwings/schedule',
  EDM: 'https://www.nhl.com/oilers/schedule',
  FLA: 'https://www.nhl.com/panthers/schedule',
  LAK: 'https://www.nhl.com/kings/schedule',
  MIN: 'https://www.nhl.com/wild/schedule',
  MTL: 'https://www.nhl.com/canadiens/schedule',
  NJD: 'https://www.nhl.com/devils/schedule',
  NSH: 'https://www.nhl.com/predators/schedule',
  NYI: 'https://www.nhl.com/islanders/schedule',
  NYR: 'https://www.nhl.com/rangers/schedule',
  OTT: 'https://www.nhl.com/senators/schedule',
  PHI: 'https://www.nhl.com/flyers/schedule',
  PIT: 'https://www.nhl.com/penguins/schedule',
  SEA: 'https://www.nhl.com/kraken/schedule',
  SJS: 'https://www.nhl.com/sharks/schedule',
  STL: 'https://www.nhl.com/blues/schedule',
  TBL: 'https://www.nhl.com/lightning/schedule',
  TOR: 'https://www.nhl.com/mapleleafs/schedule',
  VAN: 'https://www.nhl.com/canucks/schedule',
  VGK: 'https://www.nhl.com/goldenknights/schedule',
  WPG: 'https://www.nhl.com/jets/schedule',
  WSH: 'https://www.nhl.com/capitals/schedule',
};

/**
 * Get the official schedule URL for a team
 * @param teamAbbreviation - Team abbreviation (e.g., 'LAL', 'KC', 'NYY')
 * @param leagueType - League type (nba, nfl, mlb, nhl)
 * @returns Official schedule URL or null if not found
 */
export function getTeamScheduleUrl(
  teamAbbreviation: string,
  leagueType: LeagueType
): string | null {
  const abbrev = teamAbbreviation.toUpperCase();

  switch (leagueType) {
    case 'nba':
      return NBA_TEAM_URLS[abbrev] || null;
    case 'nfl':
      return NFL_TEAM_URLS[abbrev] || null;
    case 'mlb':
      return MLB_TEAM_URLS[abbrev] || null;
    case 'nhl':
      return NHL_TEAM_URLS[abbrev] || null;
    default:
      return null;
  }
}

/**
 * Convert team name to URL slug (lowercase, hyphens)
 */
function teamNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Extract team nickname from full name (e.g., "Los Angeles Lakers" -> "lakers")
 */
function extractNBATeamName(fullName: string): string {
  // Map of full team names to their NBA.com paths
  const nbaTeamNames: Record<string, string> = {
    'atlanta-hawks': 'hawks',
    'boston-celtics': 'celtics',
    'brooklyn-nets': 'nets',
    'charlotte-hornets': 'hornets',
    'chicago-bulls': 'bulls',
    'cleveland-cavaliers': 'cavaliers',
    'dallas-mavericks': 'mavericks',
    'denver-nuggets': 'nuggets',
    'detroit-pistons': 'pistons',
    'golden-state-warriors': 'warriors',
    'houston-rockets': 'rockets',
    'indiana-pacers': 'pacers',
    'la-clippers': 'clippers',
    'los-angeles-clippers': 'clippers',
    'lakers': 'lakers',
    'la-lakers': 'lakers',
    'los-angeles-lakers': 'lakers',
    'memphis-grizzlies': 'grizzlies',
    'miami-heat': 'heat',
    'milwaukee-bucks': 'bucks',
    'minnesota-timberwolves': 'timberwolves',
    'new-orleans-pelicans': 'pelicans',
    'new-york-knicks': 'knicks',
    'oklahoma-city-thunder': 'thunder',
    'orlando-magic': 'magic',
    'philadelphia-76ers': 'sixers',
    'phoenix-suns': 'suns',
    'portland-trail-blazers': 'blazers',
    'sacramento-kings': 'kings',
    'san-antonio-spurs': 'spurs',
    'toronto-raptors': 'raptors',
    'utah-jazz': 'jazz',
    'washington-wizards': 'wizards',
  };

  const slug = teamNameToSlug(fullName);
  return nbaTeamNames[slug] || slug.split('-').pop() || slug;
}

/**
 * Get the official team page URL (standings/overview)
 * @param teamName - Full team name or abbreviation
 * @param leagueType - League type
 * @returns Official team page URL
 */
export function getTeamPageUrl(
  teamName: string,
  leagueType: LeagueType
): string | null {
  const slug = teamNameToSlug(teamName);

  switch (leagueType) {
    case 'nba':
      // NBA uses team nickname like /lakers, /warriors
      const nbaTeam = extractNBATeamName(teamName);
      return `https://www.nba.com/${nbaTeam}`;
    case 'nfl':
      // NFL uses team domain names
      const nflDomains: Record<string, string> = {
        'arizona-cardinals': 'azcardinals.com',
        'atlanta-falcons': 'atlantafalcons.com',
        'baltimore-ravens': 'baltimoreravens.com',
        'buffalo-bills': 'buffalobills.com',
        'carolina-panthers': 'panthers.com',
        'chicago-bears': 'chicagobears.com',
        'cincinnati-bengals': 'bengals.com',
        'cleveland-browns': 'clevelandbrowns.com',
        'dallas-cowboys': 'dallascowboys.com',
        'denver-broncos': 'denverbroncos.com',
        'detroit-lions': 'detroitlions.com',
        'green-bay-packers': 'packers.com',
        'houston-texans': 'houstontexans.com',
        'indianapolis-colts': 'colts.com',
        'jacksonville-jaguars': 'jaguars.com',
        'kansas-city-chiefs': 'chiefs.com',
        'las-vegas-raiders': 'raiders.com',
        'los-angeles-chargers': 'chargers.com',
        'los-angeles-rams': 'therams.com',
        'miami-dolphins': 'miamidolphins.com',
        'minnesota-vikings': 'vikings.com',
        'new-england-patriots': 'patriots.com',
        'new-orleans-saints': 'neworleanssaints.com',
        'new-york-giants': 'giants.com',
        'new-york-jets': 'newyorkjets.com',
        'philadelphia-eagles': 'philadelphiaeagles.com',
        'pittsburgh-steelers': 'steelers.com',
        'san-francisco-49ers': '49ers.com',
        'seattle-seahawks': 'seahawks.com',
        'tampa-bay-buccaneers': 'buccaneers.com',
        'tennessee-titans': 'titansonline.com',
        'washington-commanders': 'commanders.com',
      };
      return nflDomains[slug] ? `https://www.${nflDomains[slug]}` : null;
    case 'mlb':
      // MLB uses /team-slug format
      return `https://www.mlb.com/${slug}`;
    case 'nhl':
      // NHL uses /team-slug format
      return `https://www.nhl.com/${slug}`;
    case 'lol':
      // LoL Esports uses /teams/slug
      return `https://lolesports.com/teams/${slug}`;
    case 'csgo':
      // CS:GO doesn't have a unified league page, use liquipedia
      return `https://liquipedia.net/counterstrike/${teamName.replace(/\s+/g, '_')}`;
    case 'valorant':
      // Valorant uses vlr.gg
      return `https://www.vlr.gg/team/${slug}`;
    case 'dota2':
      // Dota 2 uses liquipedia
      return `https://liquipedia.net/dota2/${teamName.replace(/\s+/g, '_')}`;
    default:
      return null;
  }
}
