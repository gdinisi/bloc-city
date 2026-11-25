import type { Anim, Pose } from './skeleton'

/*
 * Rappel des angles : 0 = droite, 90 = bas, 180 = gauche, -90 = haut.
 * Le personnage regarde vers la droite. Membre "2" = côté le plus éloigné (gris).
 */

const STAND: Pose = { torso: -90, arm: [92, 90], arm2: [88, 90], leg: [92, 90], leg2: [88, 90] }
const HIGH_PLANK: Pose = { torso: -28, head: -20, arm: [90, 90], leg: [152, 152] }
const FOREARM_PLANK: Pose = { torso: -14, head: -10, arm: [90, 0], leg: [166, 166] }
const QUAD: Pose = { torso: -24, head: -10, arm: [90, 90], leg: [90, 180] }
const HANG: Pose = { torso: -90, arm: [-74, -80], arm2: [-106, -100], leg: [95, 100], leg2: [88, 95] }
const PRONE: Pose = { torso: 0, head: 0, arm: [0, 0], leg: [180, 180] }

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
      { ...QUAD, spine: -7, head: -55 },
      { ...QUAD, spine: 10, head: 50 },
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
      { torso: -90, arm: [100, 95], arm2: [80, 85], leg: [96, 90], leg2: [84, 90] },
      { torso: -90, arm: [-145, -125], arm2: [-35, -55], leg: [112, 100], leg2: [68, 80], dy: -6 },
    ],
    fix: 'hip',
    dur: 380,
    hold: 80,
  },
  'pull-apart': {
    front: true,
    frames: [
      { torso: -90, arm: [130, 45], arm2: [50, 135], leg: [95, 90], leg2: [85, 90] },
      { torso: -90, arm: [180, 180], arm2: [0, 0], leg: [95, 90], leg2: [85, 90] },
    ],
    props: ['band-hands'],
    fix: 'hip',
    dur: 900,
  },
  'susp-legere': {
    frames: still({ ...HANG, leg: [60, 120], leg2: [55, 115] }, { shrug: 4 }),
    anchor: 'grip',
    props: ['bar'],
    dur: 1200,
    caption: 'Pieds au sol ou sur une chaise pour alléger',
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
      { torso: 196, head: 205, spine: 5, arm: [200, 200], leg: [-28, -28] },
      { torso: 190, head: 200, spine: 5, arm: [190, 190], leg: [-14, -14] },
    ],
    fix: 'hip',
    dur: 1500,
    props: ['mat'],
  },
  superman: {
    frames: [PRONE, { torso: -10, head: -22, spine: -4, arm: [-14, -14], leg: [171, 171] }],
    fix: 'hip',
    dur: 1200,
    props: ['mat'],
  },
  'dead-bug': {
    frames: [
      { torso: 180, head: 180, arm: [-90, -90], leg: [-90, 0] },
      { torso: 180, head: 180, arm: [190, 190], arm2: [-90, -90], leg: [-90, 0], leg2: [-8, -8] },
    ],
    fix: 'hip',
    dur: 1100,
    props: ['mat'],
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
    frames: [HANG, { ...HANG, arm: [70, -80], arm2: [110, -100] }],
    anchor: 'grip',
    props: ['bar'],
    dur: 1100,
  },
  'tractions-exc': {
    frames: [{ ...HANG, arm: [70, -80], arm2: [110, -100] }, HANG],
    anchor: 'grip',
    props: ['bar'],
    dur: 3000,
    hold: 600,
    caption: 'Descente lente : 5 secondes',
  },
  'scap-pull': {
    frames: [HANG, { ...HANG, shrug: 7 }],
    anchor: 'grip',
    props: ['bar'],
    dur: 800,
    caption: 'Bras tendus : seules les épaules bougent',
  },
  'tuck-lever': {
    frames: still({ torso: 180, head: 180, arm: [-62, -62], leg: [205, 20], leg2: [200, 15] }, { shrug: 2 }),
    anchor: 'grip',
    props: ['bar'],
    dur: 1500,
  },
  'tirage-elast': {
    frames: [
      { ...STAND, torso: -88, arm: [0, 0], arm2: [4, 4] },
      { ...STAND, torso: -92, arm: [150, 0], arm2: [146, 2] },
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
    frames: [
      { torso: 35, head: 60, arm: [35, 35], leg: [110, 110] },
      { torso: 52, head: 85, arm: [2, 92], leg: [110, 110] },
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
    frames: [
      { torso: -90, arm: [-125, -125], arm2: [-55, -55], leg: [95, 90], leg2: [85, 90] },
      { torso: -90, arm: [180, 180], arm2: [0, 0], leg: [95, 90], leg2: [85, 90] },
      { torso: -90, arm: [150, -125], arm2: [30, -55], leg: [95, 90], leg2: [85, 90] },
    ],
    fix: 'hip',
    dur: 700,
    hold: 600,
    caption: 'Vu de dessus : à plat ventre, bras en Y, T puis W',
  },
  'rot-ext': {
    front: true,
    frames: [
      { torso: -90, arm: [95, 5], arm2: [85, 175], leg: [95, 90], leg2: [85, 90] },
      { torso: -90, arm: [95, 160], arm2: [85, 20], leg: [95, 90], leg2: [85, 90] },
    ],
    fix: 'hip',
    dur: 900,
    caption: 'Coudes collés au corps',
  },
  'face-pull': {
    frames: [
      { ...STAND, arm: [-15, -15], arm2: [-12, -12] },
      { ...STAND, arm: [190, -60], arm2: [186, -64] },
    ],
    props: ['band'],
    dur: 900,
  },

  // ---------- Doigts ----------
  repeaters: {
    frames: [{ ...HANG, leg: [70, 110], leg2: [65, 105] }, { ...HANG, leg: [70, 110], leg2: [65, 105], shrug: 3 }],
    anchor: 'grip',
    props: ['board'],
    dur: 500,
    hold: 900,
    caption: '7 s suspendu, 3 s de pause',
  },
  'max-hang': {
    frames: still({ ...HANG, leg: [70, 110], leg2: [65, 105] }, { shrug: 3 }),
    anchor: 'grip',
    props: ['board'],
    dur: 1500,
  },
  'hang-leger': {
    frames: still({ ...HANG, leg: [70, 110], leg2: [65, 105] }, { shrug: 2 }),
    anchor: 'grip',
    props: ['board'],
    dur: 1600,
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
  'avant-bras': {
    frames: still({ ...STAND, arm: [0, 0], arm2: [42, -22] }, { arm2: [46, -26] }),
    dur: 1500,
  },
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
  'pec-porte': {
    frames: [
      { ...STAND, arm: [-10, -90], arm2: [92, 90] },
      { ...STAND, torso: -80, arm: [-22, -100], arm2: [92, 90] },
    ],
    fix: 'hand',
    props: ['wall-hand'],
    dur: 1500,
  },
  enfant: {
    frames: still({ torso: 22, head: 30, arm: [10, 2], leg: [8, 180] }, { spine: 4 }),
    fix: 'knee',
    dur: 1800,
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
