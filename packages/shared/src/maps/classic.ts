/**
 * Classic Diplomacy map (1901 start)
 * Standard 7-player map with 75 territories and 34 supply centers
 */

import type { Territory, Power, PowerId, GameState } from '../types/game.js';

export const CLASSIC_POWERS: Record<PowerId, Omit<Power, 'supplyCenters' | 'units' | 'isEliminated'>> = {
  england: { id: 'england', name: 'England', color: '#1E3A8A' },
  france: { id: 'france', name: 'France', color: '#60A5FA' },
  germany: { id: 'germany', name: 'Germany', color: '#374151' },
  italy: { id: 'italy', name: 'Italy', color: '#22C55E' },
  austria: { id: 'austria', name: 'Austria-Hungary', color: '#EF4444' },
  russia: { id: 'russia', name: 'Russia', color: '#A855F7' },
  turkey: { id: 'turkey', name: 'Turkey', color: '#F59E0B' },
};

/**
 * All territories in the classic map
 * SVG paths will be populated when we create the map visualization
 */
export const CLASSIC_TERRITORIES: Record<string, Territory> = {
  // Sea zones
  'nth': { id: 'nth', name: 'North Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['nwg', 'ska', 'den', 'hel', 'hol', 'bel', 'eng', 'lon', 'yor', 'edi', 'nwy'], svgPath: '', center: { x: 0, y: 0 } },
  'nwg': { id: 'nwg', name: 'Norwegian Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['bar', 'nwy', 'nth', 'edi', 'cly', 'nao'], svgPath: '', center: { x: 0, y: 0 } },
  'bar': { id: 'bar', name: 'Barents Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['nwg', 'nwy', 'stp_nc'], svgPath: '', center: { x: 0, y: 0 } },
  'ska': { id: 'ska', name: 'Skagerrak', type: 'sea', isSupplyCenter: false, adjacencies: ['nth', 'nwy', 'swe', 'den'], svgPath: '', center: { x: 0, y: 0 } },
  'hel': { id: 'hel', name: 'Heligoland Bight', type: 'sea', isSupplyCenter: false, adjacencies: ['nth', 'den', 'kie', 'hol'], svgPath: '', center: { x: 0, y: 0 } },
  'bal': { id: 'bal', name: 'Baltic Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['ska', 'swe', 'bot', 'lvn', 'pru', 'ber', 'kie', 'den'], svgPath: '', center: { x: 0, y: 0 } },
  'bot': { id: 'bot', name: 'Gulf of Bothnia', type: 'sea', isSupplyCenter: false, adjacencies: ['bal', 'swe', 'fin', 'stp_sc', 'lvn'], svgPath: '', center: { x: 0, y: 0 } },
  'eng': { id: 'eng', name: 'English Channel', type: 'sea', isSupplyCenter: false, adjacencies: ['nth', 'bel', 'pic', 'bre', 'mao', 'iri', 'wal', 'lon'], svgPath: '', center: { x: 0, y: 0 } },
  'iri': { id: 'iri', name: 'Irish Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['nao', 'mao', 'eng', 'wal', 'lvp'], svgPath: '', center: { x: 0, y: 0 } },
  'nao': { id: 'nao', name: 'North Atlantic Ocean', type: 'sea', isSupplyCenter: false, adjacencies: ['nwg', 'cly', 'lvp', 'iri', 'mao'], svgPath: '', center: { x: 0, y: 0 } },
  'mao': { id: 'mao', name: 'Mid-Atlantic Ocean', type: 'sea', isSupplyCenter: false, adjacencies: ['nao', 'iri', 'eng', 'bre', 'gas', 'spa_nc', 'spa_sc', 'por', 'wes', 'naf'], svgPath: '', center: { x: 0, y: 0 } },
  'wes': { id: 'wes', name: 'Western Mediterranean', type: 'sea', isSupplyCenter: false, adjacencies: ['mao', 'spa_sc', 'gol', 'tys', 'tun', 'naf'], svgPath: '', center: { x: 0, y: 0 } },
  'gol': { id: 'gol', name: 'Gulf of Lyon', type: 'sea', isSupplyCenter: false, adjacencies: ['spa_sc', 'mar', 'pie', 'tys', 'wes'], svgPath: '', center: { x: 0, y: 0 } },
  'tys': { id: 'tys', name: 'Tyrrhenian Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['gol', 'wes', 'tun', 'ion', 'nap', 'rom', 'tus'], svgPath: '', center: { x: 0, y: 0 } },
  'ion': { id: 'ion', name: 'Ionian Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['tys', 'tun', 'nap', 'apu', 'adr', 'alb', 'gre', 'aeg', 'eas'], svgPath: '', center: { x: 0, y: 0 } },
  'adr': { id: 'adr', name: 'Adriatic Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['ion', 'apu', 'ven', 'tri', 'alb'], svgPath: '', center: { x: 0, y: 0 } },
  'aeg': { id: 'aeg', name: 'Aegean Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['ion', 'gre', 'bul_sc', 'con', 'smy', 'eas'], svgPath: '', center: { x: 0, y: 0 } },
  'eas': { id: 'eas', name: 'Eastern Mediterranean', type: 'sea', isSupplyCenter: false, adjacencies: ['ion', 'aeg', 'smy', 'syr', 'eas'], svgPath: '', center: { x: 0, y: 0 } },
  'bla': { id: 'bla', name: 'Black Sea', type: 'sea', isSupplyCenter: false, adjacencies: ['bul_ec', 'rum', 'sev', 'arm', 'ank', 'con'], svgPath: '', center: { x: 0, y: 0 } },

  // England
  'cly': { id: 'cly', name: 'Clyde', type: 'coastal', isSupplyCenter: false, adjacencies: ['nao', 'nwg', 'edi', 'lvp'], svgPath: '', center: { x: 0, y: 0 } },
  'edi': { id: 'edi', name: 'Edinburgh', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'england', adjacencies: ['cly', 'nwg', 'nth', 'yor', 'lvp'], svgPath: '', center: { x: 0, y: 0 } },
  'lvp': { id: 'lvp', name: 'Liverpool', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'england', adjacencies: ['cly', 'edi', 'yor', 'wal', 'iri', 'nao'], svgPath: '', center: { x: 0, y: 0 } },
  'yor': { id: 'yor', name: 'Yorkshire', type: 'coastal', isSupplyCenter: false, adjacencies: ['edi', 'nth', 'lon', 'wal', 'lvp'], svgPath: '', center: { x: 0, y: 0 } },
  'wal': { id: 'wal', name: 'Wales', type: 'coastal', isSupplyCenter: false, adjacencies: ['lvp', 'yor', 'lon', 'eng', 'iri'], svgPath: '', center: { x: 0, y: 0 } },
  'lon': { id: 'lon', name: 'London', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'england', adjacencies: ['yor', 'nth', 'eng', 'wal'], svgPath: '', center: { x: 0, y: 0 } },

  // France
  'bre': { id: 'bre', name: 'Brest', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'france', adjacencies: ['eng', 'pic', 'par', 'gas', 'mao'], svgPath: '', center: { x: 0, y: 0 } },
  'pic': { id: 'pic', name: 'Picardy', type: 'coastal', isSupplyCenter: false, adjacencies: ['eng', 'bel', 'bur', 'par', 'bre'], svgPath: '', center: { x: 0, y: 0 } },
  'par': { id: 'par', name: 'Paris', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'france', adjacencies: ['pic', 'bur', 'gas', 'bre'], svgPath: '', center: { x: 0, y: 0 } },
  'bur': { id: 'bur', name: 'Burgundy', type: 'land', isSupplyCenter: false, adjacencies: ['pic', 'bel', 'ruh', 'mun', 'mar', 'gas', 'par'], svgPath: '', center: { x: 0, y: 0 } },
  'gas': { id: 'gas', name: 'Gascony', type: 'coastal', isSupplyCenter: false, adjacencies: ['bre', 'par', 'bur', 'mar', 'spa_nc', 'mao'], svgPath: '', center: { x: 0, y: 0 } },
  'mar': { id: 'mar', name: 'Marseilles', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'france', adjacencies: ['bur', 'pie', 'gol', 'spa_sc', 'gas'], svgPath: '', center: { x: 0, y: 0 } },

  // Germany
  'kie': { id: 'kie', name: 'Kiel', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'germany', adjacencies: ['hel', 'den', 'bal', 'ber', 'mun', 'ruh', 'hol'], svgPath: '', center: { x: 0, y: 0 } },
  'ber': { id: 'ber', name: 'Berlin', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'germany', adjacencies: ['kie', 'bal', 'pru', 'sil', 'mun'], svgPath: '', center: { x: 0, y: 0 } },
  'mun': { id: 'mun', name: 'Munich', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'germany', adjacencies: ['kie', 'ber', 'sil', 'boh', 'tyr', 'bur', 'ruh'], svgPath: '', center: { x: 0, y: 0 } },
  'pru': { id: 'pru', name: 'Prussia', type: 'coastal', isSupplyCenter: false, adjacencies: ['ber', 'bal', 'lvn', 'war', 'sil'], svgPath: '', center: { x: 0, y: 0 } },
  'sil': { id: 'sil', name: 'Silesia', type: 'land', isSupplyCenter: false, adjacencies: ['ber', 'pru', 'war', 'gal', 'boh', 'mun'], svgPath: '', center: { x: 0, y: 0 } },
  'ruh': { id: 'ruh', name: 'Ruhr', type: 'land', isSupplyCenter: false, adjacencies: ['kie', 'mun', 'bur', 'bel', 'hol'], svgPath: '', center: { x: 0, y: 0 } },

  // Italy
  'pie': { id: 'pie', name: 'Piedmont', type: 'coastal', isSupplyCenter: false, adjacencies: ['mar', 'tyr', 'ven', 'tus', 'gol'], svgPath: '', center: { x: 0, y: 0 } },
  'ven': { id: 'ven', name: 'Venice', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'italy', adjacencies: ['pie', 'tyr', 'tri', 'adr', 'apu', 'rom', 'tus'], svgPath: '', center: { x: 0, y: 0 } },
  'tus': { id: 'tus', name: 'Tuscany', type: 'coastal', isSupplyCenter: false, adjacencies: ['pie', 'ven', 'rom', 'tys', 'gol'], svgPath: '', center: { x: 0, y: 0 } },
  'rom': { id: 'rom', name: 'Rome', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'italy', adjacencies: ['tus', 'ven', 'apu', 'nap', 'tys'], svgPath: '', center: { x: 0, y: 0 } },
  'nap': { id: 'nap', name: 'Naples', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'italy', adjacencies: ['rom', 'apu', 'ion', 'tys'], svgPath: '', center: { x: 0, y: 0 } },
  'apu': { id: 'apu', name: 'Apulia', type: 'coastal', isSupplyCenter: false, adjacencies: ['ven', 'adr', 'ion', 'nap', 'rom'], svgPath: '', center: { x: 0, y: 0 } },

  // Austria-Hungary
  'tyr': { id: 'tyr', name: 'Tyrolia', type: 'land', isSupplyCenter: false, adjacencies: ['mun', 'boh', 'vie', 'tri', 'ven', 'pie'], svgPath: '', center: { x: 0, y: 0 } },
  'boh': { id: 'boh', name: 'Bohemia', type: 'land', isSupplyCenter: false, adjacencies: ['mun', 'sil', 'gal', 'vie', 'tyr'], svgPath: '', center: { x: 0, y: 0 } },
  'vie': { id: 'vie', name: 'Vienna', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'austria', adjacencies: ['boh', 'gal', 'bud', 'tri', 'tyr'], svgPath: '', center: { x: 0, y: 0 } },
  'tri': { id: 'tri', name: 'Trieste', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'austria', adjacencies: ['tyr', 'vie', 'bud', 'ser', 'alb', 'adr', 'ven'], svgPath: '', center: { x: 0, y: 0 } },
  'bud': { id: 'bud', name: 'Budapest', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'austria', adjacencies: ['vie', 'gal', 'rum', 'ser', 'tri'], svgPath: '', center: { x: 0, y: 0 } },
  'gal': { id: 'gal', name: 'Galicia', type: 'land', isSupplyCenter: false, adjacencies: ['boh', 'sil', 'war', 'ukr', 'rum', 'bud', 'vie'], svgPath: '', center: { x: 0, y: 0 } },

  // Russia
  'stp': { id: 'stp', name: 'St Petersburg', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'russia', adjacencies: ['bar', 'nwy', 'fin', 'bot', 'lvn', 'mos'], svgPath: '', center: { x: 0, y: 0 }, coasts: [{ id: 'stp_nc', name: 'St Petersburg (North Coast)', adjacencies: ['bar', 'nwy'] }, { id: 'stp_sc', name: 'St Petersburg (South Coast)', adjacencies: ['bot', 'fin', 'lvn'] }] },
  'mos': { id: 'mos', name: 'Moscow', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'russia', adjacencies: ['stp', 'lvn', 'war', 'ukr', 'sev'], svgPath: '', center: { x: 0, y: 0 } },
  'war': { id: 'war', name: 'Warsaw', type: 'land', isSupplyCenter: true, homeSupplyCenter: 'russia', adjacencies: ['pru', 'lvn', 'mos', 'ukr', 'gal', 'sil'], svgPath: '', center: { x: 0, y: 0 } },
  'sev': { id: 'sev', name: 'Sevastopol', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'russia', adjacencies: ['mos', 'ukr', 'rum', 'bla', 'arm'], svgPath: '', center: { x: 0, y: 0 } },
  'ukr': { id: 'ukr', name: 'Ukraine', type: 'land', isSupplyCenter: false, adjacencies: ['mos', 'war', 'gal', 'rum', 'sev'], svgPath: '', center: { x: 0, y: 0 } },
  'lvn': { id: 'lvn', name: 'Livonia', type: 'coastal', isSupplyCenter: false, adjacencies: ['stp', 'bot', 'bal', 'pru', 'war', 'mos'], svgPath: '', center: { x: 0, y: 0 } },
  'fin': { id: 'fin', name: 'Finland', type: 'coastal', isSupplyCenter: false, adjacencies: ['stp', 'nwy', 'swe', 'bot'], svgPath: '', center: { x: 0, y: 0 } },

  // Turkey
  'con': { id: 'con', name: 'Constantinople', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'turkey', adjacencies: ['bul_ec', 'bul_sc', 'bla', 'ank', 'smy', 'aeg'], svgPath: '', center: { x: 0, y: 0 } },
  'ank': { id: 'ank', name: 'Ankara', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'turkey', adjacencies: ['con', 'bla', 'arm', 'smy'], svgPath: '', center: { x: 0, y: 0 } },
  'smy': { id: 'smy', name: 'Smyrna', type: 'coastal', isSupplyCenter: true, homeSupplyCenter: 'turkey', adjacencies: ['con', 'ank', 'arm', 'syr', 'eas', 'aeg'], svgPath: '', center: { x: 0, y: 0 } },
  'arm': { id: 'arm', name: 'Armenia', type: 'coastal', isSupplyCenter: false, adjacencies: ['sev', 'bla', 'ank', 'smy', 'syr'], svgPath: '', center: { x: 0, y: 0 } },
  'syr': { id: 'syr', name: 'Syria', type: 'coastal', isSupplyCenter: false, adjacencies: ['arm', 'smy', 'eas'], svgPath: '', center: { x: 0, y: 0 } },

  // Neutrals
  'nwy': { id: 'nwy', name: 'Norway', type: 'coastal', isSupplyCenter: true, adjacencies: ['nwg', 'bar', 'stp', 'fin', 'swe', 'ska', 'nth'], svgPath: '', center: { x: 0, y: 0 } },
  'swe': { id: 'swe', name: 'Sweden', type: 'coastal', isSupplyCenter: true, adjacencies: ['nwy', 'fin', 'bot', 'bal', 'den', 'ska'], svgPath: '', center: { x: 0, y: 0 } },
  'den': { id: 'den', name: 'Denmark', type: 'coastal', isSupplyCenter: true, adjacencies: ['ska', 'swe', 'bal', 'kie', 'hel', 'nth'], svgPath: '', center: { x: 0, y: 0 } },
  'hol': { id: 'hol', name: 'Holland', type: 'coastal', isSupplyCenter: true, adjacencies: ['nth', 'hel', 'kie', 'ruh', 'bel'], svgPath: '', center: { x: 0, y: 0 } },
  'bel': { id: 'bel', name: 'Belgium', type: 'coastal', isSupplyCenter: true, adjacencies: ['nth', 'hol', 'ruh', 'bur', 'pic', 'eng'], svgPath: '', center: { x: 0, y: 0 } },
  'spa': { id: 'spa', name: 'Spain', type: 'coastal', isSupplyCenter: true, adjacencies: ['gas', 'mar', 'por', 'mao', 'gol', 'wes'], svgPath: '', center: { x: 0, y: 0 }, coasts: [{ id: 'spa_nc', name: 'Spain (North Coast)', adjacencies: ['gas', 'mao', 'por'] }, { id: 'spa_sc', name: 'Spain (South Coast)', adjacencies: ['mar', 'gol', 'wes', 'mao', 'por'] }] },
  'por': { id: 'por', name: 'Portugal', type: 'coastal', isSupplyCenter: true, adjacencies: ['spa_nc', 'spa_sc', 'mao'], svgPath: '', center: { x: 0, y: 0 } },
  'naf': { id: 'naf', name: 'North Africa', type: 'coastal', isSupplyCenter: false, adjacencies: ['mao', 'wes', 'tun'], svgPath: '', center: { x: 0, y: 0 } },
  'tun': { id: 'tun', name: 'Tunis', type: 'coastal', isSupplyCenter: true, adjacencies: ['naf', 'wes', 'tys', 'ion'], svgPath: '', center: { x: 0, y: 0 } },
  'ser': { id: 'ser', name: 'Serbia', type: 'land', isSupplyCenter: true, adjacencies: ['tri', 'bud', 'rum', 'bul', 'gre', 'alb'], svgPath: '', center: { x: 0, y: 0 } },
  'alb': { id: 'alb', name: 'Albania', type: 'coastal', isSupplyCenter: false, adjacencies: ['tri', 'ser', 'gre', 'ion', 'adr'], svgPath: '', center: { x: 0, y: 0 } },
  'gre': { id: 'gre', name: 'Greece', type: 'coastal', isSupplyCenter: true, adjacencies: ['alb', 'ser', 'bul_sc', 'aeg', 'ion'], svgPath: '', center: { x: 0, y: 0 } },
  'bul': { id: 'bul', name: 'Bulgaria', type: 'coastal', isSupplyCenter: true, adjacencies: ['ser', 'rum', 'bla', 'con', 'aeg', 'gre'], svgPath: '', center: { x: 0, y: 0 }, coasts: [{ id: 'bul_ec', name: 'Bulgaria (East Coast)', adjacencies: ['rum', 'bla', 'con'] }, { id: 'bul_sc', name: 'Bulgaria (South Coast)', adjacencies: ['con', 'aeg', 'gre'] }] },
  'rum': { id: 'rum', name: 'Rumania', type: 'coastal', isSupplyCenter: true, adjacencies: ['bud', 'gal', 'ukr', 'sev', 'bla', 'bul_ec', 'ser'], svgPath: '', center: { x: 0, y: 0 } },
};

/**
 * Starting units for 1901
 */
export const CLASSIC_STARTING_UNITS = {
  england: [
    { type: 'fleet' as const, territory: 'lon' },
    { type: 'fleet' as const, territory: 'edi' },
    { type: 'army' as const, territory: 'lvp' },
  ],
  france: [
    { type: 'fleet' as const, territory: 'bre' },
    { type: 'army' as const, territory: 'par' },
    { type: 'army' as const, territory: 'mar' },
  ],
  germany: [
    { type: 'fleet' as const, territory: 'kie' },
    { type: 'army' as const, territory: 'ber' },
    { type: 'army' as const, territory: 'mun' },
  ],
  italy: [
    { type: 'fleet' as const, territory: 'nap' },
    { type: 'army' as const, territory: 'rom' },
    { type: 'army' as const, territory: 'ven' },
  ],
  austria: [
    { type: 'fleet' as const, territory: 'tri' },
    { type: 'army' as const, territory: 'vie' },
    { type: 'army' as const, territory: 'bud' },
  ],
  russia: [
    { type: 'fleet' as const, territory: 'sev' },
    { type: 'fleet' as const, territory: 'stp', coast: 'stp_sc' },
    { type: 'army' as const, territory: 'mos' },
    { type: 'army' as const, territory: 'war' },
  ],
  turkey: [
    { type: 'fleet' as const, territory: 'ank' },
    { type: 'army' as const, territory: 'con' },
    { type: 'army' as const, territory: 'smy' },
  ],
};

/**
 * Create initial game state for classic Diplomacy
 */
export function createClassicGameState(playerPower: PowerId, victoryCondition: number = 18): GameState {
  const powers: Record<PowerId, Power> = {} as Record<PowerId, Power>;

  for (const [id, powerInfo] of Object.entries(CLASSIC_POWERS)) {
    const powerId = id as PowerId;
    const startingUnits = CLASSIC_STARTING_UNITS[powerId];
    const homeSCs = Object.values(CLASSIC_TERRITORIES)
      .filter(t => t.homeSupplyCenter === powerId)
      .map(t => t.id);

    powers[powerId] = {
      ...powerInfo,
      supplyCenters: homeSCs,
      units: startingUnits.map(u => ({
        type: u.type,
        territory: u.territory,
        coast: 'coast' in u ? u.coast : undefined,
        power: powerId,
      })),
      isEliminated: false,
    };
  }

  return {
    id: crypto.randomUUID(),
    variant: 'classic',
    year: 1901,
    phase: 'spring_orders',
    powers,
    territories: CLASSIC_TERRITORIES,
    playerPower,
    victoryCondition,
    isComplete: false,
    totalApiCost: 0,
  };
}
