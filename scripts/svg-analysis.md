# SVG Structure Analysis

## Critical Finding: Polylines vs Polygons

The SVG has two types of paths in the "Land" layer:

### 1. **Polygons** (closed shapes) - These are complete territory shapes
Examples: polygon40, polygon78, polygon100, polygon106, etc.

### 2. **Polylines** (open paths) - These are BORDER LINES, not territory shapes!
- `polyline122` - starts at (413, 464) - traces a BORDER
- `polyline128` - starts at (371, 438) - traces a BORDER
- `polyline432` - starts at (134, 417) - traces Spain's BORDER
- `polyline436` - starts at (40, 441) - traces a BORDER through Iberia

**The polyline436 starting at SVG X=40 is NOT a territory - it's a border line!**
It starts in Iberia and traces along territory boundaries across the map.

## Why This Matters

The current extraction script treats polylines as territories, causing:
1. `polyline436` mapped to 'bud' (Budapest) - WRONG! It's a border line starting in Iberia
2. `polyline432` mapped to 'spa' (Spain) - This is Spain's border outline, not the territory
3. `polyline122` and `polyline128` mapped to 'vie'/'boh' - These are border fragments

## Missing Territory Polygons

Some territories don't have dedicated polygons because the SVG uses shared borders:
- **Denmark (den)** - No polygon found
- **Galicia (gal)** - No polygon found
- **Trieste (tri)** - No polygon found
- **Budapest (bud)** - No polygon found (polyline436 is NOT Budapest)

## Current Mapping Status

### Correctly Mapped Territories (high confidence):
| Polygon ID | Territory | Screen Position | Notes |
|-----------|-----------|-----------------|-------|
| polygon332 | nwy | (569, 297) | Norway |
| polygon456 | swe | (520, 432) | Sweden |
| polygon140 | cly | (277, 426) | Clyde |
| polygon172 | edi | (313, 445) | Edinburgh |
| polygon526 | lvp | (243, 543) | Liverpool |
| polygon106 | bre | (190, 656) | Brest |
| polygon340 | par | (277, 737) | Paris |
| polygon282 | bur | (320, 826) | Burgundy |
| polygon198 | gas | (269, 836) | Gascony |
| polygon134 | mar | (394, 741) | Marseilles |
| polygon360 | por | (118, 817) | Portugal |
| polygon326 | naf | (1, 1030) | North Africa |
| polygon478 | tun | (384, 1030) | Tunisia |
| polygon492 | pie | (456, 762) | Piedmont |
| polygon510 | ven | (511, 800) | Venice |
| polygon486 | tus | (447, 824) | Tuscany |
| polygon374 | rom | (528, 913) | Rome |
| polygon312 | nap | (588, 975) | Naples |
| polygon54 | apu | (601, 964) | Apulia |
| polygon40 | alb | (634, 955) | Albania |
| polygon204 | gre | (666, 1008) | Greece |
| polygon156 | bul | (951, 927) | Bulgaria |
| polygon46 | fin | (1857, 1712) | Finland |
| polygon424 | lvn | (1511, 1958) | Livonia |
| polygon296 | sev | (1907, 724) | Sevastopol |
| polygon186 | war | (1247, 795) | Warsaw |
| polygon268 | arm | (1305, 1141) | Armenia |
| polygon532 | syr | (1230, 1323) | Syria |
| polygon86 | ank | (1051, 1120) | Ankara |
| polygon368 | smy | (1219, 1163) | Smyrna |
| path1820 | con | (916, 1088) | Constantinople |
| path3469 | rum | (1436, 770) | Romania |
| polyline450 | ukr | (1479, 663) | Ukraine |
| polyline444 | mos | (1907, 724) | Moscow |
| path3423 | stp | (1929, 139) | St. Petersburg |

### Incorrectly Mapped Territories:
| Current | Polygon ID | Screen Position | Should Be |
|---------|-----------|-----------------|-----------|
| bud | polyline436 | (76, 881) | WRONG - This is in IBERIA! Not a territory. |
| mun | polygon388 | (737, 851) | Questionable - X=737 is too far east for Munich |
| kie | polygon192 | (764, 749) | Questionable - X=764 is too far east for Kiel |

### Territories Needing Polygon Re-examination:
| Territory | Expected Screen X | Expected Screen Y | Notes |
|-----------|------------------|------------------|-------|
| wal | 240-300 | 480-540 | Need to verify polygon260 |
| yor | 280-340 | 490-550 | Need to verify polygon546 |
| lon | 280-340 | 560-620 | Need to verify polygon274 |
| ruh | 340-420 | 620-690 | Need to verify polygon78 |
| bel | 370-440 | 580-650 | Need to verify polygon230 |
| hol | 400-480 | 540-610 | Need to verify polygon354 |
| ber | 520-600 | 660-720 | polygon100 looks OK |
| mun | 500-580 | 760-830 | polygon388 is at X=737, TOO FAR EAST |
| kie | 450-520 | 450-520 | polygon192 is at X=764, TOO FAR EAST |
| pru | 560-640 | 700-770 | polygon518 looks OK |
| sil | 620-700 | 730-800 | polygon114 looks OK |

### Missing Territories (no polygon):
| Territory | Expected Screen Position | Status |
|-----------|-------------------------|--------|
| den | X: 580-650, Y: 400-500 | No polygon - placeholder needed |
| gal | X: 780-860, Y: 800-870 | No polygon - placeholder needed |
| tri | X: 580-660, Y: 850-920 | No polygon - placeholder needed |
| bud | X: 760-840, Y: 860-930 | No polygon - polyline436 is WRONG |
| boh | X: 700-780, Y: 850-920 | polyline122/128 are borders, not shapes |
| vie | X: 720-800, Y: 870-940 | polyline122/128 are borders, not shapes |
| ser | X: 640-720, Y: 860-930 | polygon396 might be correct |

## Root Cause Analysis

1. **The SVG uses SHARED BORDERS** - Some adjacent territories don't have separate polygons; they share border lines defined as polylines.

2. **polyline436 is a BORDER CHAIN** - It starts at SVG (40, 441) in Iberia and traces along multiple territory boundaries. It should NOT be mapped to any single territory.

3. **Austria-Hungary region is complex** - BOH, VIE, BUD, GAL, TRI all share borders and may not have individual closed polygons.

## Recommended Actions

### Option A: Re-extract from SVG with better logic
- Parse the SVG to find actual closed polygon shapes
- For polylines, determine which territory they belong to by analyzing their geographic extent
- Generate missing territory shapes from border intersections

### Option B: Manual coordinate assignment
- Use the label positions from "Labels_land" layer as territory centers
- Create placeholder polygons around those centers
- Visual verification and adjustment

### Option C: Hybrid approach
- Use valid polygons where they exist
- Extract label positions for missing territories
- Create minimal placeholder shapes for missing polygons
