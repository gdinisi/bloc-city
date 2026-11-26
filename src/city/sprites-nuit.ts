// Généré par atelier-ville/nuit-appli.mjs — ne pas modifier à la main.
import type { Sprite } from './sprites'

/** Bâtiments (id-sens) et sols disponibles de nuit, avec la version de leur image ;
 * les autres gardent leur image de jour */
export const NUIT_BATS: Record<string, string> = {
  "arbre-d": "f7c52a60",
  "arbre-g": "7ed83aa1",
  "arche-d": "0f2a6999",
  "arche-g": "8e75bd61",
  "bloc-d": "392cc140",
  "bloc-g": "b432e75c",
  "boulangerie-d": "041c8b8a",
  "boulangerie-g": "464e76e6",
  "cafe-d": "b5071374",
  "cafe-g": "b8f4a25b",
  "chalet-d": "4d3ccd56",
  "chalet-g": "151d3f07",
  "chateau-d": "2ce386b7",
  "chateau-g": "cbc36174",
  "colisee-d": "58278886",
  "colisee-g": "7eeba71a",
  "falaise-d": "e1451448",
  "falaise-g": "1ee7d2c4",
  "fontaine-d": "09df4596",
  "fontaine-g": "da613070",
  "fusee-d": "807b1d42",
  "fusee-g": "65ed61a6",
  "grande-paroi-d": "d3c35189",
  "grande-paroi-g": "dcc75cb9",
  "gratte-ciel-d": "679f5c06",
  "gratte-ciel-g": "9b90c546",
  "immeuble-d": "a77e4125",
  "immeuble-g": "aa584541",
  "jardin-d": "c48c5a8d",
  "jardin-g": "92cbd6bb",
  "kiosque-d": "b89dd20e",
  "kiosque-g": "b4016e11",
  "lac-d": "f0e73b76",
  "lac-g": "1f3d9ed5",
  "magasin-sport-d": "c1283f00",
  "magasin-sport-g": "557ac32c",
  "maison-bleue-d": "f8a4eeb9",
  "maison-bleue-g": "d5b57672",
  "maison-jaune-d": "9eb6ab24",
  "maison-jaune-g": "dbd7b0ae",
  "maison-rose-d": "7f77f3bd",
  "maison-rose-g": "ff1fb040",
  "marche-d": "93beba45",
  "marche-g": "870f08c9",
  "moai-d": "32254477",
  "moai-g": "3b1251a5",
  "mur-d": "f4e20ff0",
  "mur-g": "42d80701",
  "observatoire-d": "ca1e758c",
  "observatoire-g": "7d26c79d",
  "phare-d": "65862112",
  "phare-g": "fed4b432",
  "pyramide-d": "79543fd8",
  "pyramide-g": "d2b35075",
  "refuge-d": "9998920c",
  "refuge-g": "2680fd77",
  "salle-bloc-d": "b2160ed3",
  "salle-bloc-g": "a0f8fb39",
  "sapin-d": "e1aeed39",
  "sapin-g": "bea9bb75",
  "statue-d": "992e1fff",
  "statue-g": "3ac0c428",
  "temple-d": "f5bec80a",
  "temple-g": "7c17f3d9",
  "tour-eiffel-d": "08520f9a",
  "tour-eiffel-g": "640441b3",
  "tour-horloge-d": "7096844d",
  "tour-horloge-g": "9367320c",
  "tour-verre-d": "121636c1",
  "tour-verre-g": "d44b3eae",
  "villa-d": "adeac0aa",
  "villa-g": "c45396f4"
}
export const NUIT_SOLS: Record<string, string> = {
  "eau": "6acf524c",
  "falaise-c-1-1": "8ccc1bbe",
  "falaise-c-1-2": "a69a8b3e",
  "falaise-c-1-3": "9a6dd987",
  "falaise-c-1-4": "0ec82a27",
  "falaise-c-2-1": "9503182b",
  "falaise-c-2-2": "12196079",
  "falaise-c-2-3": "89d95f91",
  "falaise-c-2-4": "134b4cd2",
  "falaise-c-3-1": "e10bbe5c",
  "falaise-c-3-2": "51ee0adc",
  "falaise-c-3-3": "127e6a59",
  "falaise-c-3-4": "cb583a3e",
  "falaise-c-4-1": "0a330ddb",
  "falaise-c-4-2": "d530648e",
  "falaise-c-4-3": "6f95aaff",
  "falaise-c-4-4": "4ce1d35d",
  "falaise-d-1": "507942ba",
  "falaise-d-2": "b969104e",
  "falaise-d-3": "b2120c26",
  "falaise-d-4": "9c2e38ba",
  "falaise-g-1": "cd971d2a",
  "falaise-g-2": "4b7a3495",
  "falaise-g-3": "4d63bf34",
  "falaise-g-4": "67f83994",
  "fleurs": "72ff8222",
  "herbe": "820b900a",
  "herbe2": "46a3735b",
  "mer": "4a42684a",
  "mer-motif": "4b052fd0",
  "neige": "fb6f5e8d",
  "paves": "4ad5d6e8",
  "pied-d": "c32ea691",
  "pied-g": "33e6aff5",
  "planches": "8c4cbd58",
  "rivage-00000001": "40074bfb",
  "rivage-00000010": "6abc3966",
  "rivage-00000011": "80ea1257",
  "rivage-00000100": "aaa64ada",
  "rivage-00000101": "2ae203e6",
  "rivage-00000110": "1f3f4d5c",
  "rivage-00000111": "8c86cb85",
  "rivage-00001000": "9c01c723",
  "rivage-00001001": "acc3db4c",
  "rivage-00001010": "0704210a",
  "rivage-00001011": "e4cfa402",
  "rivage-00001100": "68912390",
  "rivage-00001101": "92f21a5e",
  "rivage-00001110": "02dd67bf",
  "rivage-00001111": "5956788c",
  "rivage-00010000": "c1d587bf",
  "rivage-00010100": "bddb8934",
  "rivage-00011000": "73893c35",
  "rivage-00011100": "52acdb4b",
  "rivage-00100000": "e05dade7",
  "rivage-00100001": "f9126586",
  "rivage-00101000": "dc95b5d6",
  "rivage-00101001": "e412dbc1",
  "rivage-00110000": "284b19fc",
  "rivage-00111000": "3e10add2",
  "rivage-01000000": "27fa6528",
  "rivage-01000001": "5bf7e246",
  "rivage-01000010": "4c7a76e0",
  "rivage-01000011": "7a1d980a",
  "rivage-01010000": "48127c4a",
  "rivage-01100000": "e7f2dc49",
  "rivage-01100001": "8aa31e4d",
  "rivage-01110000": "63089507",
  "rivage-10000000": "9e64b4c0",
  "rivage-10000010": "e9563873",
  "rivage-10000100": "c01a44d7",
  "rivage-10000110": "1ae041a6",
  "rivage-10010000": "17546aae",
  "rivage-10010100": "b97a8991",
  "rivage-10100000": "61003320",
  "rivage-10110000": "8b1cff53",
  "rivage-11000000": "73e60036",
  "rivage-11000010": "438f375e",
  "rivage-11010000": "c3447c10",
  "rivage-11100000": "55902021",
  "rivage-11110000": "ad6d4130",
  "sable": "8ba29cb2",
  "terre": "64344149"
}
/** Cadrage des couches de lumière (unités de la carte SVG, origine = centre de l'emprise) */
export const NUIT_LUM: Record<string, Sprite> = {
  "arbre-d": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "30d00d73"
  },
  "arbre-g": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "02177022"
  },
  "arche-d": {
    "w": 191.65,
    "h": 123.47,
    "ox": 95.82,
    "oy": 73.79,
    "v": "62969f12"
  },
  "arche-g": {
    "w": 191.65,
    "h": 123.47,
    "ox": 95.82,
    "oy": 73.79,
    "v": "8387e166"
  },
  "bloc-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "374f913b"
  },
  "bloc-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "3497b746"
  },
  "boulangerie-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "441d95fb"
  },
  "boulangerie-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "e256ae1d"
  },
  "cafe-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "2654c05d"
  },
  "cafe-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "a0d61940"
  },
  "chalet-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "1b160d0c"
  },
  "chalet-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "3ff3ab54"
  },
  "chateau-d": {
    "w": 228.4,
    "h": 149.66,
    "ox": 114.2,
    "oy": 90.86,
    "v": "11e0ab55"
  },
  "chateau-g": {
    "w": 228.4,
    "h": 149.66,
    "ox": 114.2,
    "oy": 90.86,
    "v": "a6679ba0"
  },
  "colisee-d": {
    "w": 266.81,
    "h": 162.7,
    "ox": 133.41,
    "oy": 94.31,
    "v": "c8c50c7a"
  },
  "colisee-g": {
    "w": 266.81,
    "h": 162.7,
    "ox": 133.41,
    "oy": 94.31,
    "v": "24fddad5"
  },
  "falaise-d": {
    "w": 191.65,
    "h": 126.42,
    "ox": 95.82,
    "oy": 76.76,
    "v": "7cfb20a9"
  },
  "falaise-g": {
    "w": 191.65,
    "h": 126.42,
    "ox": 95.82,
    "oy": 76.76,
    "v": "62595422"
  },
  "fontaine-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "0786efdf"
  },
  "fontaine-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "7836eeb4"
  },
  "fusee-d": {
    "w": 191.65,
    "h": 139.79,
    "ox": 95.82,
    "oy": 90.12,
    "v": "c3b0fdb2"
  },
  "fusee-g": {
    "w": 191.65,
    "h": 139.79,
    "ox": 95.82,
    "oy": 90.12,
    "v": "d7d8d70e"
  },
  "grande-paroi-d": {
    "w": 228.4,
    "h": 156.85,
    "ox": 114.2,
    "oy": 98.06,
    "v": "9f74d910"
  },
  "grande-paroi-g": {
    "w": 228.4,
    "h": 156.85,
    "ox": 114.2,
    "oy": 98.06,
    "v": "2a03978d"
  },
  "gratte-ciel-d": {
    "w": 191.65,
    "h": 138.29,
    "ox": 95.82,
    "oy": 88.63,
    "v": "7fd70fc3"
  },
  "gratte-ciel-g": {
    "w": 191.65,
    "h": 138.29,
    "ox": 95.82,
    "oy": 88.63,
    "v": "a668fbc3"
  },
  "immeuble-d": {
    "w": 162.82,
    "h": 106.91,
    "ox": 81.41,
    "oy": 64.28,
    "v": "61afa1e1"
  },
  "immeuble-g": {
    "w": 162.82,
    "h": 106.91,
    "ox": 81.41,
    "oy": 64.28,
    "v": "82e530d7"
  },
  "jardin-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "250f5bdd"
  },
  "jardin-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "21c2729e"
  },
  "kiosque-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "01bb4d02"
  },
  "kiosque-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "a88cb1dc"
  },
  "lac-d": {
    "w": 191.65,
    "h": 116.05,
    "ox": 95.82,
    "oy": 66.38,
    "v": "872fdab7"
  },
  "lac-g": {
    "w": 191.65,
    "h": 116.05,
    "ox": 95.82,
    "oy": 66.38,
    "v": "b49ea4da"
  },
  "magasin-sport-d": {
    "w": 191.65,
    "h": 120.51,
    "ox": 95.82,
    "oy": 70.83,
    "v": "a8998689"
  },
  "magasin-sport-g": {
    "w": 191.65,
    "h": 120.51,
    "ox": 95.82,
    "oy": 70.83,
    "v": "3ad25ca0"
  },
  "maison-bleue-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "ffcf554e"
  },
  "maison-bleue-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "c79fa89d"
  },
  "maison-jaune-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "cf5a8658"
  },
  "maison-jaune-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "f35eb3b8"
  },
  "maison-rose-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "e7e5d3db"
  },
  "maison-rose-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "60e7ec92"
  },
  "marche-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "2178057e"
  },
  "marche-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "6add4413"
  },
  "moai-d": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "b4d3887b"
  },
  "moai-g": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "4c855f39"
  },
  "mur-d": {
    "w": 162.82,
    "h": 106.91,
    "ox": 81.41,
    "oy": 64.28,
    "v": "98f5a14b"
  },
  "mur-g": {
    "w": 162.82,
    "h": 106.91,
    "ox": 81.41,
    "oy": 64.28,
    "v": "d7b8718b"
  },
  "observatoire-d": {
    "w": 191.65,
    "h": 123.47,
    "ox": 95.82,
    "oy": 73.79,
    "v": "9f154f53"
  },
  "observatoire-g": {
    "w": 191.65,
    "h": 123.47,
    "ox": 95.82,
    "oy": 73.79,
    "v": "34a04632"
  },
  "phare-d": {
    "w": 198.65,
    "h": 139.54,
    "ox": 81.4,
    "oy": 86.45,
    "v": "c468f6cd"
  },
  "phare-g": {
    "w": 198.65,
    "h": 139.54,
    "ox": 117.24,
    "oy": 86.45,
    "v": "fdc15eab"
  },
  "pyramide-d": {
    "w": 266.81,
    "h": 174.05,
    "ox": 133.41,
    "oy": 105.66,
    "v": "55f8faec"
  },
  "pyramide-g": {
    "w": 266.81,
    "h": 174.05,
    "ox": 133.41,
    "oy": 105.66,
    "v": "7cad3093"
  },
  "refuge-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "1a172de3"
  },
  "refuge-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "9489814f"
  },
  "salle-bloc-d": {
    "w": 191.65,
    "h": 124.97,
    "ox": 95.82,
    "oy": 75.29,
    "v": "e3e08bca"
  },
  "salle-bloc-g": {
    "w": 191.65,
    "h": 124.97,
    "ox": 95.82,
    "oy": 75.29,
    "v": "c7916b17"
  },
  "sapin-d": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "abc95713"
  },
  "sapin-g": {
    "w": 162.82,
    "h": 105.26,
    "ox": 81.41,
    "oy": 62.63,
    "v": "6eb53ed8"
  },
  "statue-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "31c46f1a"
  },
  "statue-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "5d990860"
  },
  "temple-d": {
    "w": 228.4,
    "h": 141.01,
    "ox": 114.2,
    "oy": 82.21,
    "v": "df50d221"
  },
  "temple-g": {
    "w": 228.4,
    "h": 141.01,
    "ox": 114.2,
    "oy": 82.21,
    "v": "582fbb96"
  },
  "tour-eiffel-d": {
    "w": 228.4,
    "h": 183.52,
    "ox": 114.2,
    "oy": 124.72,
    "v": "00a64344"
  },
  "tour-eiffel-g": {
    "w": 228.4,
    "h": 183.52,
    "ox": 114.2,
    "oy": 124.72,
    "v": "9e566e0a"
  },
  "tour-horloge-d": {
    "w": 162.82,
    "h": 121.62,
    "ox": 81.41,
    "oy": 78.98,
    "v": "778991cd"
  },
  "tour-horloge-g": {
    "w": 162.82,
    "h": 121.62,
    "ox": 81.41,
    "oy": 78.98,
    "v": "c0ec0315"
  },
  "tour-verre-d": {
    "w": 228.4,
    "h": 177.03,
    "ox": 114.2,
    "oy": 118.23,
    "v": "e0c08e6c"
  },
  "tour-verre-g": {
    "w": 228.4,
    "h": 177.03,
    "ox": 114.2,
    "oy": 118.23,
    "v": "626e4fd0"
  },
  "villa-d": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "db47758c"
  },
  "villa-g": {
    "w": 162.82,
    "h": 103.66,
    "ox": 81.41,
    "oy": 61.02,
    "v": "0fe1af09"
  }
}
