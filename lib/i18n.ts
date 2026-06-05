// lib/i18n.ts
// Multi-language support (i18n) – CZ / EN

export type Language = 'cs' | 'en';

export interface Translations {
  [key: string]: string | { [key: string]: string };
}

const translations: Record<Language, Translations> = {
  cs: {
    // Header & Navigation
    'app.title': 'DJI Waypoint Planner',
    'app.subtitle': 'Plánování letových misí',
    'nav.missions': 'Mise',
    'nav.guide': 'Návod',
    'nav.help': 'Nápověda',
    'nav.settings': '⚙️ Nastavení',

    // Sidebar – Tabs
    'tab.photo': '📷 Foto',
    'tab.film': '🎬 Film',
    'tab.search': 'Hledej lokaci',

    // Mission Types (Foto)
    'mission.waypoints': 'Waypointy',
    'mission.spiral': 'Spirála',
    'mission.grid': 'Grid',
    'mission.orbit': 'Orbit',
    'mission.facade': 'Fasáda',

    // Mission Types (Film)
    'film.dronie': 'Dronie',
    'film.reveal': 'Reveal',
    'film.topdown': 'Top-down',
    'film.craneup': 'Crane Up',
    'film.hyperlapse': 'Hyperlapse',
    'film.arcshot': 'Arc Shot',
    'film.boomerang': 'Boomerang',
    'film.rocket': 'Rocket',
    'film.poisequence': 'POI Sequence',

    // Common buttons
    'btn.add': 'Přidat',
    'btn.edit': 'Upravit',
    'btn.delete': 'Smazat',
    'btn.cancel': 'Zrušit',
    'btn.save': 'Uložit',
    'btn.export': 'Exportovat',
    'btn.import': 'Importovat',
    'btn.close': 'Zavřít',
    'btn.clear': 'Vymazat',
    'btn.reset': 'Resetovat',
    'btn.confirm': 'Potvrdit',
    'btn.share': 'Sdílet',

    // Sidebar – Controls
    'sidebar.newMission': '➕ Nová mise',
    'sidebar.myMissions': '📂 Moje mise',
    'sidebar.export': '⬇️ Export KMZ',
    'sidebar.exportLitchi': '⬇️ Export Litchi CSV',
    'sidebar.import': '⬆️ Import KMZ',
    'sidebar.terrain': '🏔 Terrain Following',
    'sidebar.3dPreview': '🔭 3D náhled',
    'sidebar.share': '🔗 Sdílet misi',

    // Waypoint Parameters
    'waypoint.height': 'Výška (m)',
    'waypoint.speed': 'Rychlost (m/s)',
    'waypoint.wait': 'Čekání (s)',
    'waypoint.gimbal': 'Gimbal (°)',
    'waypoint.camera': 'Kamera',
    'waypoint.heading': 'Kurz (°)',
    'waypoint.heading.fixed': 'Fixní',
    'waypoint.heading.toPoi': 'Na POI',
    'waypoint.heading.forward': 'Vpřed',

    // Camera Actions
    'camera.none': 'Nic',
    'camera.photo': 'Foto',
    'camera.startVideo': 'Spustit video',
    'camera.stopVideo': 'Zastavit video',

    // Spiral Parameters
    'spiral.center': 'Střed',
    'spiral.startRadius': 'Počáteční poloměr (m)',
    'spiral.endRadius': 'Konečný poloměr (m)',
    'spiral.turns': 'Počet otáček',
    'spiral.startHeight': 'Počáteční výška (m)',
    'spiral.endHeight': 'Konečná výška (m)',
    'spiral.direction': 'Směr',
    'spiral.direction.cw': '↻ Po směru',
    'spiral.direction.ccw': '↺ Proti směru',

    // Grid Parameters
    'grid.corner1': '1. Roh',
    'grid.corner2': '2. Roh',
    'grid.height': 'Výška letu (m)',
    'grid.overlap': 'Překryv (%). Doporučeno 70–80%',
    'grid.distance': 'Vzdál. od fasády (m)',
    'grid.angle': 'Směr (°)',
    'grid.photos': 'Odhadovaně fotek: ',

    // Orbit Parameters
    'orbit.center': 'Střed POI',
    'orbit.radius': 'Poloměr (m)',
    'orbit.turns': 'Počet otáček',

    // Facade Parameters
    'facade.buildingType': 'Typ budovy',
    'facade.buildingType.oneside': 'Jedna strana',
    'facade.buildingType.360': '360°',
    'facade.corners': 'Zadej 2 rohy',
    'facade.distance': 'Vzdál. od fasády (m)',
    'facade.height': 'Výška letu (m)',

    // Hyperlapse Parameters
    'hyperlapse.distance': 'Vzdálenost (m)',
    'hyperlapse.interval': 'Interval fotek (s)',
    'hyperlapse.gimbalMode': 'Gimbal režim',
    'hyperlapse.gimbalMode.fixed': 'Fixní',
    'hyperlapse.gimbalMode.toPoi': 'Na POI',
    'hyperlapse.gimbalMode.follow': 'Sleduj trasu',

    // POI Sequence Parameters
    'poiSeq.addPoi': 'Přidej POI',
    'poiSeq.removePoi': 'Odeber POI',
    'poiSeq.distance': 'Vzdálenost (m)',
    'poiSeq.height': 'Výška (m)',
    'poiSeq.speed': 'Rychlost (m/s)',
    'poiSeq.turnDuration': 'Trvání otáčky (s)',

    // Map Layers
    'map.osm': 'Mapový podklad',
    'map.satellite': 'Satelit',
    'map.terrain': 'Terén',
    'map.airspace': '🚧 Letové zóny',
    'map.protected': '🌿 NP a CHKO',
    'map.reserves': '🌱 Přírodní rezervace',
    'map.water': '💧 Voda',
    'map.railways': '🚂 Železnice',
    'map.powerlines': '⚡ Elektřina',
    'map.roads': '🛣️ Silnice',

    // Collision Detection
    'collision.danger': '⛔ NEBEZPEČÍ',
    'collision.warning': '⚠️ VAROVÁNÍ',
    'collision.caution': 'ℹ️ INFORMACE',
    'collision.zonesAffected': 'zón v omezené oblasti',
    'collision.tryToAvoid': 'Pokus se vyhnout',

    // Battery Estimate
    'battery.title': '🔋 Odhad baterie',
    'battery.distance': 'Vzdálenost:',
    'battery.duration': 'Čas letu:',
    'battery.reserve': 'Rezerva 20%',
    'battery.estimated': 'Odhadovaná spotřeba:',

    // Panels & Dialogs
    'panel.saveMission': 'Uložit misi',
    'panel.missionName': 'Název mise',
    'panel.editWaypoint': 'Upravit waypoint',
    'panel.deleteWaypoint': 'Smazat waypoint?',
    'panel.deleteAll': 'Smazat všechny waypointy?',
    'panel.loadMission': 'Načíst misi',
    'panel.noPowerMissions': 'Žádné uložené mise',
    'panel.confirmDelete': 'Opravdu chceš smazat?',
    'panel.waypointLimit': 'Limit 200 waypointů dosažen',

    // Search & Geocoding
    'search.placeholder': 'Hledej místo v ČR...',
    'search.noResults': 'Žádné výsledky',
    'search.loading': 'Hledám...',

    // Settings
    'settings.title': 'Nastavení',
    'settings.pilots': 'Piloti',
    'settings.drones': 'Drony',
    'settings.activePilot': 'Aktivní pilot',
    'settings.activeDrone': 'Aktivní dron',
    'settings.language': 'Jazyk',
    'settings.addPilot': 'Přidej pilota',
    'settings.addDrone': 'Přidej drona',
    'settings.pilotName': 'Jméno pilota',
    'settings.pilotEmail': 'Email',
    'settings.pilotId': 'ÚCL provozovatele',
    'settings.certNumber': 'Číslo licence',
    'settings.droneModel': 'Model dronu',
    'settings.droneName': 'Jméno dronu',
    'settings.droneWeight': 'Hmotnost (g)',
    'settings.batteryWh': 'Baterie (Wh)',
    'settings.avgPower': 'Průměr. spotřeba (W)',
    'settings.category': 'Kategorie',

    // Messages & Notifications
    'msg.success': 'Hotovo!',
    'msg.error': 'Chyba',
    'msg.warning': 'Pozor',
    'msg.loading': 'Načítám...',
    'msg.copied': 'Odkaz zkopírován',
    'msg.imported': 'Mise importována',
    'msg.exported': 'Mise exportována',
    'msg.saved': 'Mise uložena',
    'msg.deleted': 'Mise smazána',

    // Help Section
    'help.title': 'Nápověda',
    'help.overview': 'Přehled',
    'help.photo': 'Fotogrammetrie',
    'help.film': 'Filmařský modul',
    'help.airspace': 'Letové zóny',
    'help.collision': 'Kolizní detekce',
    'help.parameters': 'Parametry waypointu',
    'help.terrain': 'Terrain Following',
    'help.sharing': 'Sdílení mise',
    'help.battery': 'Odhad baterie',
    'help.import': 'Import KMZ',
    'help.protected': 'Přírodní ochrana',
    'help.railways': 'Železnice',
    'help.powerlines': 'Elektrické vedení',
    'help.roads': 'Silnice a dálnice',
    'help.water': 'Vodní zdroje',
    'help.transfer': 'Přenos do dronu',

    // Guide Section
    'guide.title': 'Návod na přenos',
    'guide.step1': 'Exportuj KMZ soubor',
    'guide.step2': 'Vytvoř dummy misi v DJI Fly',
    'guide.step3': 'Připoj RC 2 k PC přes USB-C',
    'guide.step4': 'Najdi složku mise',
    'guide.step5': 'Přepři KMZ soubor',
    'guide.step6': 'Ověř misi v DJI Fly',
  },

  en: {
    // Header & Navigation
    'app.title': 'DJI Waypoint Planner',
    'app.subtitle': 'Flight Mission Planner',
    'nav.missions': 'Missions',
    'nav.guide': 'Guide',
    'nav.help': 'Help',
    'nav.settings': '⚙️ Settings',

    // Sidebar – Tabs
    'tab.photo': '📷 Photo',
    'tab.film': '🎬 Film',
    'tab.search': 'Search location',

    // Mission Types (Foto)
    'mission.waypoints': 'Waypoints',
    'mission.spiral': 'Spiral',
    'mission.grid': 'Grid',
    'mission.orbit': 'Orbit',
    'mission.facade': 'Facade',

    // Mission Types (Film)
    'film.dronie': 'Dronie',
    'film.reveal': 'Reveal',
    'film.topdown': 'Top-down',
    'film.craneup': 'Crane Up',
    'film.hyperlapse': 'Hyperlapse',
    'film.arcshot': 'Arc Shot',
    'film.boomerang': 'Boomerang',
    'film.rocket': 'Rocket',
    'film.poisequence': 'POI Sequence',

    // Common buttons
    'btn.add': 'Add',
    'btn.edit': 'Edit',
    'btn.delete': 'Delete',
    'btn.cancel': 'Cancel',
    'btn.save': 'Save',
    'btn.export': 'Export',
    'btn.import': 'Import',
    'btn.close': 'Close',
    'btn.clear': 'Clear',
    'btn.reset': 'Reset',
    'btn.confirm': 'Confirm',
    'btn.share': 'Share',

    // Sidebar – Controls
    'sidebar.newMission': '➕ New Mission',
    'sidebar.myMissions': '📂 My Missions',
    'sidebar.export': '⬇️ Export KMZ',
    'sidebar.exportLitchi': '⬇️ Export Litchi CSV',
    'sidebar.import': '⬆️ Import KMZ',
    'sidebar.terrain': '🏔 Terrain Following',
    'sidebar.3dPreview': '🔭 3D Preview',
    'sidebar.share': '🔗 Share Mission',

    // Waypoint Parameters
    'waypoint.height': 'Height (m)',
    'waypoint.speed': 'Speed (m/s)',
    'waypoint.wait': 'Wait (s)',
    'waypoint.gimbal': 'Gimbal (°)',
    'waypoint.camera': 'Camera',
    'waypoint.heading': 'Heading (°)',
    'waypoint.heading.fixed': 'Fixed',
    'waypoint.heading.toPoi': 'Toward POI',
    'waypoint.heading.forward': 'Forward',

    // Camera Actions
    'camera.none': 'None',
    'camera.photo': 'Photo',
    'camera.startVideo': 'Start Video',
    'camera.stopVideo': 'Stop Video',

    // Spiral Parameters
    'spiral.center': 'Center',
    'spiral.startRadius': 'Start Radius (m)',
    'spiral.endRadius': 'End Radius (m)',
    'spiral.turns': 'Number of Turns',
    'spiral.startHeight': 'Start Height (m)',
    'spiral.endHeight': 'End Height (m)',
    'spiral.direction': 'Direction',
    'spiral.direction.cw': '↻ Clockwise',
    'spiral.direction.ccw': '↺ Counter-clockwise',

    // Grid Parameters
    'grid.corner1': '1st Corner',
    'grid.corner2': '2nd Corner',
    'grid.height': 'Flight Height (m)',
    'grid.overlap': 'Overlap (%). Recommended 70–80%',
    'grid.distance': 'Distance from Facade (m)',
    'grid.angle': 'Direction (°)',
    'grid.photos': 'Estimated photos: ',

    // Orbit Parameters
    'orbit.center': 'POI Center',
    'orbit.radius': 'Radius (m)',
    'orbit.turns': 'Number of Turns',

    // Facade Parameters
    'facade.buildingType': 'Building Type',
    'facade.buildingType.oneside': 'One Side',
    'facade.buildingType.360': '360°',
    'facade.corners': 'Set 2 corners',
    'facade.distance': 'Distance from Facade (m)',
    'facade.height': 'Flight Height (m)',

    // Hyperlapse Parameters
    'hyperlapse.distance': 'Distance (m)',
    'hyperlapse.interval': 'Photo Interval (s)',
    'hyperlapse.gimbalMode': 'Gimbal Mode',
    'hyperlapse.gimbalMode.fixed': 'Fixed',
    'hyperlapse.gimbalMode.toPoi': 'Toward POI',
    'hyperlapse.gimbalMode.follow': 'Follow Route',

    // POI Sequence Parameters
    'poiSeq.addPoi': 'Add POI',
    'poiSeq.removePoi': 'Remove POI',
    'poiSeq.distance': 'Distance (m)',
    'poiSeq.height': 'Height (m)',
    'poiSeq.speed': 'Speed (m/s)',
    'poiSeq.turnDuration': 'Turn Duration (s)',

    // Map Layers
    'map.osm': 'Map Tiles',
    'map.satellite': 'Satellite',
    'map.terrain': 'Terrain',
    'map.airspace': '🚧 Airspace',
    'map.protected': '🌿 Protected Areas',
    'map.reserves': '🌱 Nature Reserves',
    'map.water': '💧 Water Sources',
    'map.railways': '🚂 Railways',
    'map.powerlines': '⚡ Power Lines',
    'map.roads': '🛣️ Roads',

    // Collision Detection
    'collision.danger': '⛔ DANGER',
    'collision.warning': '⚠️ WARNING',
    'collision.caution': 'ℹ️ INFO',
    'collision.zonesAffected': 'zones in restricted area',
    'collision.tryToAvoid': 'Try to avoid',

    // Battery Estimate
    'battery.title': '🔋 Battery Estimate',
    'battery.distance': 'Distance:',
    'battery.duration': 'Flight Time:',
    'battery.reserve': 'Reserve 20%',
    'battery.estimated': 'Estimated usage:',

    // Panels & Dialogs
    'panel.saveMission': 'Save Mission',
    'panel.missionName': 'Mission Name',
    'panel.editWaypoint': 'Edit Waypoint',
    'panel.deleteWaypoint': 'Delete waypoint?',
    'panel.deleteAll': 'Delete all waypoints?',
    'panel.loadMission': 'Load Mission',
    'panel.noMissions': 'No saved missions',
    'panel.confirmDelete': 'Are you sure?',
    'panel.waypointLimit': 'Waypoint limit of 200 reached',

    // Search & Geocoding
    'search.placeholder': 'Search location in Czech Republic...',
    'search.noResults': 'No results',
    'search.loading': 'Searching...',

    // Settings
    'settings.title': 'Settings',
    'settings.pilots': 'Pilots',
    'settings.drones': 'Drones',
    'settings.activePilot': 'Active Pilot',
    'settings.activeDrone': 'Active Drone',
    'settings.language': 'Language',
    'settings.addPilot': 'Add Pilot',
    'settings.addDrone': 'Add Drone',
    'settings.pilotName': 'Pilot Name',
    'settings.pilotEmail': 'Email',
    'settings.pilotId': 'Operator ID',
    'settings.certNumber': 'License Number',
    'settings.droneModel': 'Drone Model',
    'settings.droneName': 'Drone Name',
    'settings.droneWeight': 'Weight (g)',
    'settings.batteryWh': 'Battery (Wh)',
    'settings.avgPower': 'Average Power (W)',
    'settings.category': 'Category',

    // Messages & Notifications
    'msg.success': 'Done!',
    'msg.error': 'Error',
    'msg.warning': 'Warning',
    'msg.loading': 'Loading...',
    'msg.copied': 'Link copied',
    'msg.imported': 'Mission imported',
    'msg.exported': 'Mission exported',
    'msg.saved': 'Mission saved',
    'msg.deleted': 'Mission deleted',

    // Help Section
    'help.title': 'Help',
    'help.overview': 'Overview',
    'help.photo': 'Photogrammetry',
    'help.film': 'Film Module',
    'help.airspace': 'Airspace',
    'help.collision': 'Collision Detection',
    'help.parameters': 'Waypoint Parameters',
    'help.terrain': 'Terrain Following',
    'help.sharing': 'Mission Sharing',
    'help.battery': 'Battery Estimate',
    'help.import': 'Import KMZ',
    'help.protected': 'Protected Areas',
    'help.railways': 'Railways',
    'help.powerlines': 'Power Lines',
    'help.roads': 'Roads & Motorways',
    'help.water': 'Water Sources',
    'help.transfer': 'Transfer to Drone',

    // Guide Section
    'guide.title': 'Transfer Guide',
    'guide.step1': 'Export KMZ file',
    'guide.step2': 'Create dummy mission in DJI Fly',
    'guide.step3': 'Connect RC 2 to PC via USB-C',
    'guide.step4': 'Find mission folder',
    'guide.step5': 'Replace KMZ file',
    'guide.step6': 'Verify mission in DJI Fly',
  },
};

export function getTranslation(language: Language, key: string): string {
  const current = translations[language]?.[key];

  if (typeof current === 'string') {
    return current;
  }

  const fallback = translations.en?.[key];

  if (typeof fallback === 'string') {
    return fallback;
  }

  return key;
}

export const DEFAULT_LANGUAGE: Language = 'cs';
