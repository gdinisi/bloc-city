import type { Anim, Pose } from './skeleton'

/*
 * Rappel des angles : 0 = droite, 90 = bas, 180 = gauche, -90 = haut.
 * De profil, le personnage regarde vers la droite ; le membre "2" est le côté éloigné (gris).
 * De face (front), "arm"/"leg" = côté gauche de l'image, "arm2"/"leg2" = côté droit.
 */

const STAND: Pose = { torso: -90, arm: [92, 90], arm2: [88, 90], leg: [92, 90], leg2: [88, 90] }
const HIGH_PLANK: Pose = { torso: -28, head: -20, arm: [90, 90], leg: [152, 152] }
const FOREARM_PLANK: Pose = { torso: -14, head: -10, arm: [90, 0], leg: [166, 166] }
const QUAD: Pose = { torso: -24, head: -10, arm: [90, 90], leg: [90, 180] }
const HANG: Pose = { torso: -90, arm: [-74, -80], arm2: [-106, -100], leg: [95, 100], leg2: [88, 95] }
const HANG_BENT: Pose = { ...HANG, leg: [70, 110], leg2: [65, 105] }
const PRONE: Pose = { torso: 0, head: 0, arm: [0, 0], leg: [180, 180] }

/** Vue de face, debout */
const FRONT_STAND: Pose = { torso: -90, arm: [100, 95], arm2: [80, 85], leg: [94, 90], leg2: [86, 90] }
/** Vue de face, suspendu (genoux pliés vers l'arrière) */
const FRONT_HANG: Pose = { torso: -90, arm: [-115, -110], arm2: [-65, -70], leg: [96, 92], leg2: [84, 88], shinK: 0.45 }
/** En haut : coudes descendus le long du corps (le bras gauche passe par la gauche : -210 et non 150) */
const FRONT_TOP: Pose = { ...FRONT_HANG, arm: [-210, -80], arm2: [30, -100] }

/** Dead bug de profil, sur le dos : bras au plafond (légèrement écartés pour voir les deux), genoux à 90° */
const DEAD_BUG_START: Pose = {
  torso: 180,
  head: 180,
  arm: [-97, -97],
  arm2: [-83, -83],
  leg: [-92, -2],
  leg2: [-84, 4],
}

/** Ouverture thoracique vue de dessus, couché à l'horizontale (tête à gauche, ventre vers le bas de l'image) */
const OPEN_BOOK: Pose = { torso: 180, head: 180, arm: [94, 94], arm2: [90, 90], leg: [90, 0], leg2: [94, 2] }

const still = (p: Pose, breathe: Partial<Pose> = { spine: 3 }): Pose[] => [p, { ...p, ...breathe }]

export const ANIMS: Record<string, Anim> = {
  // ---------- Échauffement ----------
  'rot-epaules': {
    frames: [
      { ...STAND, arm: [-90, -90], arm2: [-90, -90] },
      { ...STAND, arm: [270, 270], arm2: [270, 270] },
    ],
    wrap: true,
    hold: 0,
    dur: 1800,
  },
  'chat-vache': {
    frames: [
      { ...QUAD, spine: -7, head: -55, label: 'Inspire : creuse le dos' },
      { ...QUAD, spine: 10, head: 50, label: 'Expire : enroule le dos' },
    ],
    fix: 'knee',
    dur: 1500,
  },
  poignets: {
    frames: [QUAD, { ...QUAD, arm: [102, 102], leg: [108, 180] }],
    fix: 'knee',
    dur: 1300,
  },
  'pompes-scap': {
    frames: [HIGH_PLANK, { ...HIGH_PLANK, spine: 8 }],
    fix: 'foot',
    dur: 700,
  },
  jumping: {
    front: true,
    frames: [
      { ...FRONT_STAND, hold: 120 },
      // bras par l'extérieur jusqu'au-dessus de la tête, jambes écartées, petit saut
      { torso: -90, arm: [240, 260], arm2: [-60, -80], leg: [116, 98], leg2: [64, 82], dy: -5, hold: 120 },
    ],
    fix: 'hip',
    dur: 420,
  },
  'pull-apart': {
    front: true,
    frames: [
      { ...FRONT_STAND, arm: [80, 80], arm2: [100, 100], armK: 0.42, label: 'Bras tendus devant toi', hold: 500 },
      { ...FRONT_STAND, arm: [180, 180], arm2: [0, 0], label: 'Écarte jusqu\'à la poitrine', hold: 500 },
    ],
    props: ['band-hands'],
    fix: 'hip',
    dur: 900,
  },
  'susp-legere': {
    frames: [
      { ...HANG, leg: [60, 100], leg2: [56, 104], label: 'Pieds au sol : tu allèges' },
      { ...HANG, leg: [60, 100], leg2: [56, 104], shrug: 3, label: 'Pieds au sol : tu allèges' },
    ],
    anchor: 'grip',
    props: ['bar'],
    dur: 1200,
  },

  // ---------- Gainage ----------
  planche: { frames: still(FOREARM_PLANK, { spine: 2 }), dur: 1500, props: ['mat'] },
  'planche-lat': {
    front: true,
    frames: still({ torso: -18, head: -20, arm: [-90, -90], arm2: [95, 95], leg: [162, 162], leg2: [162, 162] }, { torso: -16, leg: [164, 164], leg2: [164, 164] }),
    fix: 'foot',
    dur: 1500,
    caption: 'Vu de face',
    props: ['mat'],
  },
  hollow: {
    frames: [
      { torso: 196, head: 205, spine: 5, arm: [200, 200], leg: [-28, -28], label: 'Sur le DOS · bas du dos collé' },
      { torso: 190, head: 200, spine: 5, arm: [190, 190], leg: [-14, -14], label: 'Sur le DOS · bas du dos collé' },
    ],
    fix: 'hip',
    dur: 1500,
    props: ['mat'],
    caption: 'Le corps forme une banane, regard vers le plafond',
  },
  superman: {
    frames: [
      { ...PRONE, label: 'Sur le VENTRE' },
      { torso: -10, head: -14, spine: -4, arm: [-14, -14], leg: [171, 171], label: 'Sur le VENTRE · décolle tout' },
    ],
    fix: 'hip',
    dur: 1200,
    props: ['mat'],
    caption: 'Regard vers le sol, bras et jambes décollés',
  },
  'dead-bug': {
    /*
     * De profil, allongé sur le dos, tête à gauche. Départ : bras tendus vers le plafond, genoux à 90°.
     * Le bras qui part derrière la tête et la jambe opposée qui s'allonge sont colorés en bleu.
     */
    frames: [
      { ...DEAD_BUG_START, label: 'Bras vers le plafond, genoux à 90°' },
      { ...DEAD_BUG_START, arm: [-160, -160], leg2: [-5, -5], hl: ['arm', 'leg2'], label: 'Un bras derrière la tête + la jambe opposée' },
      { ...DEAD_BUG_START, label: 'Reviens au centre' },
      { ...DEAD_BUG_START, arm2: [-160, -160], leg: [-5, -5], hl: ['arm2', 'leg'], label: 'Change de côté' },
    ],
    fix: 'hip',
    dur: 1000,
    hold: 500,
    props: ['mat'],
    caption: 'Allongé sur le dos · en bleu : les membres qui bougent ensemble',
  },
  'bird-dog': {
    frames: [QUAD, { ...QUAD, arm: [-8, -8], arm2: [90, 90], leg2: [174, 174] }],
    fix: 'knee',
    dur: 1100,
    props: ['mat'],
  },
  mountain: {
    frames: [
      { ...HIGH_PLANK, leg: [30, 160], leg2: [152, 152] },
      { ...HIGH_PLANK, leg: [152, 152], leg2: [30, 160] },
    ],
    fix: 'hand',
    dur: 320,
    hold: 60,
  },
  'planche-touch': {
    frames: [HIGH_PLANK, { ...HIGH_PLANK, arm: [150, -30], arm2: [90, 90] }],
    fix: 'foot',
    dur: 700,
  },
  'releve-genoux': {
    frames: [HANG, { ...HANG, torso: -100, leg: [-35, 75], leg2: [-30, 80] }],
    anchor: 'grip',
    props: ['bar'],
    dur: 1000,
  },

  // ---------- Tirage ----------
  'rowing-table': {
    frames: [
      { torso: 195, head: 195, arm: [-80, -80], leg: [15, 15] },
      { torso: 228, head: 228, arm: [100, -80], leg: [48, 48] },
    ],
    fix: 'foot',
    props: ['table-hands'],
    dur: 1000,
    caption: 'Sous une table solide, talons au sol',
  },
  tractions: {
    front: true,
    frames: [
      { ...FRONT_HANG, label: 'Bras tendus', hold: 500 },
      { ...FRONT_TOP, label: 'Menton au-dessus de la barre', hold: 500 },
    ],
    anchor: 'grip',
    props: ['bar'],
    dur: 1100,
  },
  'tractions-exc': {
    front: true,
    frames: [
      { ...FRONT_TOP, leg: [94, 90], leg2: [86, 90], shinK: 1, label: 'Monte en haut (chaise ou saut)', hold: 700, dur: 500 },
      { ...FRONT_TOP, label: 'Lâche la chaise', hold: 300, dur: 3200 },
      { ...FRONT_HANG, label: 'Descends en 5 secondes', hold: 600, dur: 700 },
    ],
    anchor: 'grip',
    props: ['bar', 'chair-foot'],
  },
  'scap-pull': {
    frames: [
      { ...HANG, label: 'Épaules relâchées' },
      { ...HANG, shrug: 7, label: 'Abaisse les épaules' },
    ],
    anchor: 'grip',
    props: ['bar'],
    dur: 800,
    caption: 'Bras tendus : seules les épaules bougent',
  },
  'tuck-lever': {
    frames: [
      { ...HANG, label: 'Suspendu bras tendus', hold: 500 },
      // dos horizontal, visage vers le plafond ; cuisses remontées vers la poitrine, tibias repliés
      { torso: -180, head: -180, arm: [-70, -70], arm2: [-76, -76], leg: [-122, 8], leg2: [-128, 2], label: 'Dos à l\'horizontale, genoux contre la poitrine', hold: 1600 },
    ],
    anchor: 'grip',
    props: ['bar'],
    dur: 1200,
  },
  'tirage-elast': {
    frames: [
      { ...STAND, torso: -88, arm: [0, 0], arm2: [4, 4], label: 'Bras tendus vers l\'accroche' },
      { ...STAND, torso: -92, arm: [150, 0], arm2: [146, 2], label: 'Tire les coudes en arrière' },
    ],
    props: ['band'],
    dur: 900,
  },

  // ---------- Antagonistes ----------
  pompes: {
    frames: [HIGH_PLANK, { torso: -8, head: -4, arm: [200, 60], leg: [172, 172] }],
    fix: 'foot',
    dur: 900,
  },
  'pompes-diamant': {
    frames: [HIGH_PLANK, { torso: -8, head: -4, arm: [195, 55], leg: [172, 172] }],
    fix: 'foot',
    dur: 900,
    caption: 'Mains rapprochées, coudes le long du corps',
  },
  pike: {
    // V inversé : fesses au plus haut, bras dans le prolongement du dos (jambes à leur vraie longueur)
    frames: [
      { torso: 52, head: 72, arm: [64, 64], leg: [105, 105], legK: 1.4, label: 'Fesses en l\'air, bras tendus', hold: 500 },
      { torso: 56.3, head: 84, arm: [136.5, 26.6], leg: [125, 125], legK: 1.4, label: 'Plie les coudes : la tête vers le sol', hold: 500 },
    ],
    fix: 'foot',
    dur: 1000,
  },
  'dips-chaise': {
    frames: [
      { torso: -85, arm: [100, 100], leg: [5, 75] },
      { torso: -85, arm: [190, 80], leg: [-28, 62] },
    ],
    fix: 'hand',
    props: ['chair-hands'],
    dur: 1000,
  },
  ytw: {
    front: true,
    top: true,
    anchor: 'center',
    frames: [
      { torso: -90, arm: [235, 235], arm2: [-55, -55], leg: [93, 90], leg2: [87, 90], label: 'Y : bras en diagonale', hold: 700 },
      { torso: -90, arm: [180, 180], arm2: [0, 0], leg: [93, 90], leg2: [87, 90], label: 'T : bras sur les côtés', hold: 700 },
      { torso: -90, arm: [140, 220], arm2: [40, -40], leg: [93, 90], leg2: [87, 90], label: 'W : coudes vers les côtes', hold: 700 },
    ],
    fix: 'hip',
    dur: 700,
    caption: 'Vu de dessus : allongé sur le ventre, bras décollés du sol',
  },
  'rot-ext': {
    front: true,
    frames: [
      { ...FRONT_STAND, arm: [92, 90], arm2: [88, 90], foreK: 0.3, label: 'Coudes collés, mains devant toi', hold: 500 },
      { ...FRONT_STAND, arm: [92, 180], arm2: [88, 0], foreK: 0.95, label: 'Écarte les mains vers l\'extérieur', hold: 500 },
    ],
    props: ['band-hands'],
    fix: 'hip',
    dur: 1000,
  },
  'face-pull': {
    frames: [
      { ...STAND, arm: [-15, -15], arm2: [-12, -12], label: 'Bras tendus vers l\'accroche' },
      { ...STAND, arm: [190, -60], arm2: [186, -64], label: 'Tire vers le visage, coudes hauts' },
    ],
    props: ['band'],
    dur: 900,
  },

  // ---------- Doigts ----------
  repeaters: {
    frames: [
      { ...HANG_BENT, label: 'Suspendu 7 s', hold: 1400 },
      { ...HANG, arm: [-70, -55], arm2: [-110, -125], leg: [92, 90], leg2: [88, 90], pin: 'neck', label: 'Pause 3 s : pieds au sol', hold: 600 },
    ],
    anchor: 'grip',
    props: ['board'],
    dur: 300,
    caption: '6 fois de suite = 1 tour, puis 2 à 3 min de repos',
  },
  'max-hang': {
    frames: [
      { ...HANG_BENT, label: '10 s sur une PETITE prise', hold: 1800 },
      { ...STAND, pin: 'neck', label: 'Repos complet : 2 min', hold: 1400 },
    ],
    anchor: 'grip',
    props: ['board-edge'],
    dur: 500,
    caption: 'Prise exigeante (en rouge), jamais jusqu\'à l\'échec',
  },
  'hang-leger': {
    frames: [
      { ...HANG_BENT, label: '20 s sur une GROSSE prise', hold: 1600 },
      { ...HANG_BENT, shrug: 3, label: '20 s sur une GROSSE prise', hold: 1600 },
    ],
    anchor: 'grip',
    props: ['board-jug'],
    dur: 1200,
    caption: 'Grosse prise confortable (en vert)',
  },

  // ---------- Jambes ----------
  squat: {
    frames: [
      { ...STAND, arm: [80, 80], arm2: [80, 80] },
      { torso: -58, head: -80, arm: [0, 0], arm2: [4, 4], leg: [8, 108], leg2: [4, 104] },
    ],
    fix: 'foot',
    dur: 1000,
  },
  fentes: {
    frames: [
      { ...STAND, leg: [80, 90], leg2: [100, 90] },
      { torso: -90, arm: [92, 90], leg: [10, 92], leg2: [118, 172] },
    ],
    fix: 'foot',
    dur: 1000,
  },
  pont: {
    frames: [
      { torso: 180, head: 180, arm: [10, 0], leg: [-50, 80] },
      { torso: 158, head: 170, arm: [15, 0], leg: [-14, 96] },
    ],
    fix: 'foot',
    dur: 1000,
    props: ['mat'],
  },
  pistol: {
    frames: [
      { torso: -90, arm: [20, 0], leg: [90, 90], leg2: [30, 40] },
      { torso: -52, head: -75, arm: [0, 0], leg: [-6, 106], leg2: [-8, -8] },
    ],
    fix: 'foot',
    dur: 1300,
  },
  'high-step': {
    frames: [
      { torso: -80, arm: [100, 90], leg: [-10, 100], leg2: [90, 90] },
      { torso: -90, arm: [92, 90], leg: [90, 90], leg2: [95, 85] },
    ],
    fix: 'foot',
    props: ['chair-foot'],
    dur: 1100,
    caption: 'Pied posé sur une chaise, monte sans élan',
  },

  // ---------- Mobilité ----------
  grenouille: {
    frames: [
      { torso: -10, head: -15, arm: [90, 0], leg: [90, 180] },
      { torso: -4, head: -10, arm: [90, 0], leg: [62, 180] },
    ],
    fix: 'knee',
    dur: 1800,
    caption: 'Genoux très écartés, recule le bassin',
    props: ['mat'],
  },
  pigeon: {
    frames: [
      { torso: -82, arm: [96, 90], arm2: [84, 90], leg: [12, 168], leg2: [176, 178] },
      { torso: -12, head: -5, arm: [8, 8], arm2: [4, 4], leg: [12, 168], leg2: [176, 178] },
    ],
    fix: 'hip',
    dur: 1800,
    props: ['mat'],
  },
  papillon: {
    front: true,
    frames: [
      { torso: -90, arm: [100, 75], arm2: [80, 105], leg: [155, 35], leg2: [25, 145] },
      { torso: -90, arm: [100, 75], arm2: [80, 105], leg: [172, 22], leg2: [8, 158] },
    ],
    fix: 'hip',
    dur: 1200,
    caption: 'Plantes de pieds collées',
    props: ['mat'],
  },
  'squat-profond': {
    frames: still({ torso: -62, head: -80, arm: [30, 0], arm2: [34, 4], leg: [-12, 112], leg2: [-16, 108] }, { torso: -66 }),
    fix: 'foot',
    dur: 1600,
  },
  'ouverture-thorax': {
    /*
     * Vu de dessus, allongé sur le côté, tête à gauche, le ventre vers le bas de l'image.
     * Genoux pliés devant soi. Le bras du dessus part de devant (bas), monte vers le plafond
     * (il paraît court) et se pose derrière (haut).
     */
    top: true,
    anchor: 'center',
    frames: [
      { ...OPEN_BOOK, arm: [94, 94], label: 'Bras l\'un sur l\'autre, devant toi', hold: 700 },
      { ...OPEN_BOOK, arm: [150, 150], armK: 0.18, hl: ['arm'], label: 'Monte le bras vers le plafond', hold: 100 },
      { ...OPEN_BOOK, arm: [268, 268], hl: ['arm'], label: 'Pose-le derrière toi, regarde ta main', hold: 1000 },
      { ...OPEN_BOOK, arm: [150, 150], armK: 0.18, hl: ['arm'], label: 'Reviens lentement', hold: 100 },
    ],
    fix: 'hip',
    dur: 1100,
    caption: 'Vu de dessus : allongé sur le côté, genoux pliés restent au sol',
  },
  'pec-porte': {
    frames: [
      { ...STAND, arm: [185, -90], arm2: [92, 90], label: 'Avant-bras contre le cadre', hold: 600 },
      { ...STAND, torso: -84, arm: [200, -88], arm2: [92, 90], leg: [82, 92], leg2: [100, 88], label: 'Avance le buste', hold: 900 },
    ],
    fix: 'hand',
    props: ['door-hand'],
    dur: 1400,
    caption: 'Coude à hauteur d\'épaule, bras derrière toi',
  },
  enfant: {
    frames: [
      { torso: -85, arm: [95, 60], leg: [23, 180], label: 'À genoux, assis sur les talons', hold: 600 },
      { torso: 9, head: 2, arm: [4, 0], leg: [23, 180], label: 'Bras loin devant, front au sol', hold: 1400 },
    ],
    fix: 'knee',
    dur: 1600,
    props: ['mat'],
  },
  dorsaux: {
    frames: [
      { torso: -10, head: -5, arm: [-5, -5], leg: [90, 90], leg2: [92, 90] },
      { torso: 4, head: 10, arm: [-12, -12], leg: [80, 98], leg2: [82, 96], spine: -4 },
    ],
    fix: 'foot',
    props: ['table-hands'],
    dur: 1600,
  },
}
