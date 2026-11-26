// Généré par atelier-ville/sprites-appli.mjs — ne pas modifier à la main.
// Rendus Blender des bâtiments : taille (w, h) et origine (ox, oy = centre de l'emprise au sol)
// en unités de la carte SVG (une case = 40 de large). Images : public/img/ville/<id>-<g|d>.webp
// (« d » = façade à droite = sens par défaut ; « g » = bâtiment tourné).
export interface Sprite {
  w: number
  h: number
  ox: number
  oy: number
}

export const SPRITES: Record<string, Sprite> = {
  "arbre": {
    "w": 42.85,
    "h": 45.3,
    "ox": 21.43,
    "oy": 32.66
  },
  "arche": {
    "w": 82.58,
    "h": 68.91,
    "ox": 41.29,
    "oy": 46.52
  },
  "bloc": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "boulangerie": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "cafe": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "chalet": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "chateau": {
    "w": 122.5,
    "h": 96.71,
    "ox": 61.25,
    "oy": 64.38
  },
  "colisee": {
    "w": 162.45,
    "h": 110.51,
    "ox": 81.23,
    "oy": 68.21
  },
  "falaise": {
    "w": 82.58,
    "h": 71.91,
    "ox": 41.29,
    "oy": 49.5
  },
  "fontaine": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "fusee": {
    "w": 82.58,
    "h": 85.24,
    "ox": 41.29,
    "oy": 62.84
  },
  "grande-paroi": {
    "w": 122.5,
    "h": 103.9,
    "ox": 61.25,
    "oy": 71.58
  },
  "gratte-ciel": {
    "w": 82.58,
    "h": 83.78,
    "ox": 41.29,
    "oy": 61.38
  },
  "immeuble": {
    "w": 42.85,
    "h": 46.9,
    "ox": 21.43,
    "oy": 34.27
  },
  "jardin": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "kiosque": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "lac": {
    "w": 82.58,
    "h": 61.5,
    "ox": 41.29,
    "oy": 39.1
  },
  "magasin-sport": {
    "w": 82.58,
    "h": 65.95,
    "ox": 41.29,
    "oy": 43.56
  },
  "maison-bleue": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "maison-jaune": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "maison-rose": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "marche": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "moai": {
    "w": 42.85,
    "h": 45.3,
    "ox": 21.43,
    "oy": 32.66
  },
  "mur": {
    "w": 42.85,
    "h": 46.9,
    "ox": 21.43,
    "oy": 34.27
  },
  "observatoire": {
    "w": 82.58,
    "h": 68.91,
    "ox": 41.29,
    "oy": 46.52
  },
  "phare": {
    "w": 42.85,
    "h": 61.61,
    "ox": 21.43,
    "oy": 48.97
  },
  "pyramide": {
    "w": 162.45,
    "h": 121.87,
    "ox": 81.23,
    "oy": 79.57
  },
  "refuge": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "salle-bloc": {
    "w": 82.58,
    "h": 70.41,
    "ox": 41.29,
    "oy": 48.01
  },
  "sapin": {
    "w": 42.85,
    "h": 45.3,
    "ox": 21.43,
    "oy": 32.66
  },
  "statue": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  },
  "temple": {
    "w": 122.5,
    "h": 88.06,
    "ox": 61.25,
    "oy": 55.73
  },
  "tour-eiffel": {
    "w": 122.5,
    "h": 130.57,
    "ox": 61.25,
    "oy": 98.24
  },
  "tour-horloge": {
    "w": 42.85,
    "h": 61.61,
    "ox": 21.43,
    "oy": 48.97
  },
  "tour-verre": {
    "w": 122.5,
    "h": 124.08,
    "ox": 61.25,
    "oy": 91.75
  },
  "villa": {
    "w": 42.85,
    "h": 43.65,
    "ox": 21.43,
    "oy": 31.01
  }
}

/** Sols des cases (herbe, eau…) et rues pavées entre les cases (route-x, route-y, carrefour) */
export const SOLS: Record<string, Sprite> = {
  "carrefour-eau": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-fleurs": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-herbe": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-neige": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-paves": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-planches": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-sable": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour-terre": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "carrefour": {
    "w": 10.84,
    "h": 8.44,
    "ox": 5.42,
    "oy": 3.81
  },
  "eau": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "falaise-d-1": {
    "w": 42.85,
    "h": 31.87,
    "ox": 21.43,
    "oy": 11.82
  },
  "falaise-d-2": {
    "w": 42.85,
    "h": 38.84,
    "ox": 21.43,
    "oy": 11.81
  },
  "falaise-d-3": {
    "w": 42.85,
    "h": 45.87,
    "ox": 21.43,
    "oy": 11.82
  },
  "falaise-d-4": {
    "w": 42.85,
    "h": 52.84,
    "ox": 21.43,
    "oy": 11.82
  },
  "falaise-g-1": {
    "w": 42.85,
    "h": 31.87,
    "ox": 21.43,
    "oy": 11.82
  },
  "falaise-g-2": {
    "w": 42.85,
    "h": 38.84,
    "ox": 21.43,
    "oy": 11.81
  },
  "falaise-g-3": {
    "w": 42.85,
    "h": 45.87,
    "ox": 21.43,
    "oy": 11.82
  },
  "falaise-g-4": {
    "w": 42.85,
    "h": 52.84,
    "ox": 21.43,
    "oy": 11.82
  },
  "fleurs": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "herbe": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "herbe2": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "mer": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "neige": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "paves": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "planches": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "route-x-eau": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-fleurs": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-herbe": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-neige": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-paves": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-planches": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-sable": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x-terre": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-x": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-eau": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-fleurs": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-herbe": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-neige": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-paves": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-planches": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-sable": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y-terre": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "route-y": {
    "w": 26.82,
    "h": 16.45,
    "ox": 13.41,
    "oy": 7.82
  },
  "sable": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  },
  "terre": {
    "w": 42.85,
    "h": 23.99,
    "ox": 21.43,
    "oy": 12.41
  }
}
