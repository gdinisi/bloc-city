export type Equipment = 'barre' | 'poutre' | 'elastique'

export const EQUIPMENT: { id: Equipment; label: string; emoji: string }[] = [
  { id: 'barre', label: 'Barre de traction', emoji: '🪜' },
  { id: 'poutre', label: 'Poutre', emoji: '🪵' },
  { id: 'elastique', label: 'Élastiques', emoji: '🎗️' },
]

export type Category = 'echauffement' | 'gainage' | 'tirage' | 'antagonistes' | 'doigts' | 'jambes' | 'mobilite'

/** 1 = léger, 2 = moyen, 3 = intense */
export type Intensity = 1 | 2 | 3

export interface Exercise {
  id: string
  name: string
  cue: string
  category: Category
  /** Tout le matériel listé est nécessaire. Vide = poids du corps */
  needs: Equipment[]
  intensity: Intensity
  sets: number
  /** Durée de travail par série (secondes)… */
  work?: number
  /** …ou nombre de répétitions par série */
  reps?: number
  /** Repos entre les séries (secondes) */
  rest: number
  /** Une série par côté (gauche puis droite) */
  perSide?: boolean
  /** Nombre de tours de l'ensemble des séries (ex. repeaters) */
  rounds?: number
  /** Repos entre les tours (secondes) */
  roundRest?: number
}

export const EXERCISES: Exercise[] = [
  // ---------- Échauffement ----------
  { id: 'rot-epaules', name: 'Rotations des épaules', cue: 'Grands cercles bras tendus, 15 s dans chaque sens, puis petits cercles.', category: 'echauffement', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'chat-vache', name: 'Chat-vache', cue: 'À quatre pattes, enroule puis creuse le dos lentement avec la respiration.', category: 'echauffement', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'poignets', name: 'Mobilité des poignets', cue: 'Cercles de poignets, puis mains au sol doigts vers toi, balance doucement.', category: 'echauffement', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'pompes-scap', name: 'Pompes scapulaires', cue: 'En planche bras tendus, rapproche puis écarte les omoplates sans plier les coudes.', category: 'echauffement', needs: [], intensity: 1, sets: 1, reps: 12, rest: 0 },
  { id: 'jumping', name: 'Jumping jacks', cue: 'Rythme tranquille pour monter le cardio.', category: 'echauffement', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'pull-apart', name: 'Écartés à l\'élastique', cue: 'Bras tendus devant, écarte l\'élastique jusqu\'à la poitrine, omoplates serrées.', category: 'echauffement', needs: ['elastique'], intensity: 1, sets: 1, reps: 15, rest: 0 },
  { id: 'susp-legere', name: 'Suspension légère à la barre', cue: 'Pieds au sol ou sur une chaise pour alléger, épaules actives.', category: 'echauffement', needs: ['barre'], intensity: 1, sets: 2, work: 15, rest: 20 },

  // ---------- Gainage ----------
  { id: 'planche', name: 'Planche', cue: 'Sur les avant-bras, corps aligné, serre fessiers et abdos.', category: 'gainage', needs: [], intensity: 2, sets: 3, work: 40, rest: 20 },
  { id: 'planche-lat', name: 'Planche latérale', cue: 'Coude sous l\'épaule, bassin haut, ne t\'affaisse pas.', category: 'gainage', needs: [], intensity: 2, sets: 2, work: 30, rest: 15, perSide: true },
  { id: 'hollow', name: 'Hollow body', cue: 'Dos plaqué au sol, bras et jambes tendus décollés. Plie les genoux si c\'est trop dur.', category: 'gainage', needs: [], intensity: 3, sets: 3, work: 25, rest: 25 },
  { id: 'superman', name: 'Superman', cue: 'À plat ventre, décolle bras et jambes, regard vers le sol.', category: 'gainage', needs: [], intensity: 1, sets: 3, work: 30, rest: 20 },
  { id: 'dead-bug', name: 'Dead bug', cue: 'Sur le dos, tends bras et jambe opposés en gardant le bas du dos au sol.', category: 'gainage', needs: [], intensity: 1, sets: 3, reps: 12, rest: 20 },
  { id: 'bird-dog', name: 'Bird dog', cue: 'À quatre pattes, tends bras et jambe opposés, tiens 2 s, alterne.', category: 'gainage', needs: [], intensity: 1, sets: 2, reps: 12, rest: 20 },
  { id: 'mountain', name: 'Mountain climbers', cue: 'En planche haute, ramène les genoux vers la poitrine en alternance.', category: 'gainage', needs: [], intensity: 2, sets: 3, work: 30, rest: 30 },
  { id: 'planche-touch', name: 'Planche avec touchers d\'épaule', cue: 'Planche haute, touche l\'épaule opposée sans faire tourner le bassin.', category: 'gainage', needs: [], intensity: 2, sets: 3, reps: 16, rest: 25 },
  { id: 'releve-genoux', name: 'Relevés de genoux suspendu', cue: 'Suspendu à la barre, monte les genoux à la poitrine sans balancer.', category: 'gainage', needs: ['barre'], intensity: 3, sets: 3, reps: 8, rest: 60 },
  { id: 'essuie-glace', name: 'Essuie-glaces au sol', cue: 'Sur le dos, jambes à la verticale, descends-les d\'un côté puis de l\'autre.', category: 'gainage', needs: [], intensity: 2, sets: 3, reps: 10, rest: 30 },

  // ---------- Tirage ----------
  { id: 'rowing-table', name: 'Tirage inversé sous une table', cue: 'Allongé sous une table SOLIDE, mains au bord, tire la poitrine vers le plateau.', category: 'tirage', needs: [], intensity: 2, sets: 3, reps: 8, rest: 60 },
  { id: 'tractions', name: 'Tractions', cue: 'Prise pronation, menton au-dessus de la barre, descente contrôlée.', category: 'tirage', needs: ['barre'], intensity: 3, sets: 4, reps: 6, rest: 120 },
  { id: 'tractions-exc', name: 'Tractions excentriques', cue: 'Saute en position haute puis descends en 5 secondes.', category: 'tirage', needs: ['barre'], intensity: 3, sets: 3, reps: 4, rest: 90 },
  { id: 'scap-pull', name: 'Tirages d\'omoplates', cue: 'Suspendu bras tendus, abaisse les épaules sans plier les coudes.', category: 'tirage', needs: ['barre'], intensity: 2, sets: 3, reps: 10, rest: 60 },
  { id: 'tuck-lever', name: 'Front lever groupé', cue: 'Suspendu, genoux serrés à la poitrine, dos parallèle au sol.', category: 'tirage', needs: ['barre'], intensity: 3, sets: 4, work: 8, rest: 90 },
  { id: 'tirage-elast', name: 'Tirage à l\'élastique', cue: 'Élastique accroché devant toi, tire les coudes en arrière.', category: 'tirage', needs: ['elastique'], intensity: 2, sets: 3, reps: 15, rest: 45 },

  // ---------- Antagonistes (poussée, épaules) ----------
  { id: 'pompes', name: 'Pompes', cue: 'Mains sous les épaules, corps gainé. Sur les genoux si besoin.', category: 'antagonistes', needs: [], intensity: 2, sets: 3, reps: 10, rest: 60 },
  { id: 'pompes-diamant', name: 'Pompes serrées', cue: 'Mains rapprochées, coudes le long du corps.', category: 'antagonistes', needs: [], intensity: 3, sets: 3, reps: 8, rest: 60 },
  { id: 'pike', name: 'Pompes piquées (pike)', cue: 'Fesses en l\'air en V inversé, descends la tête entre les mains.', category: 'antagonistes', needs: [], intensity: 3, sets: 3, reps: 8, rest: 60 },
  { id: 'dips-chaise', name: 'Dips sur chaise', cue: 'Mains au bord d\'une chaise stable, descends à 90° aux coudes.', category: 'antagonistes', needs: [], intensity: 2, sets: 3, reps: 10, rest: 60 },
  { id: 'ytw', name: 'Y-T-W au sol', cue: 'À plat ventre, lève les bras en Y, puis T, puis W, pouces vers le ciel.', category: 'antagonistes', needs: [], intensity: 1, sets: 3, reps: 6, rest: 30 },
  { id: 'rot-ext', name: 'Rotations externes à l\'élastique', cue: 'Coude collé au corps à 90°, tourne l\'avant-bras vers l\'extérieur.', category: 'antagonistes', needs: ['elastique'], intensity: 1, sets: 2, reps: 15, rest: 20, perSide: true },
  { id: 'face-pull', name: 'Face pulls à l\'élastique', cue: 'Tire l\'élastique vers le visage, coudes hauts, termine pouces en arrière.', category: 'antagonistes', needs: ['elastique'], intensity: 2, sets: 3, reps: 15, rest: 30 },

  // ---------- Doigts ----------
  { id: 'repeaters', name: 'Repeaters 7/3', cue: 'Prise moyenne de la poutre : 7 s suspendu, 3 s de pause. Arrête si douleur.', category: 'doigts', needs: ['poutre'], intensity: 3, sets: 6, work: 7, rest: 3, rounds: 3, roundRest: 150 },
  { id: 'max-hang', name: 'Suspensions max', cue: 'Prise exigeante 10 s, pieds sur une chaise pour doser. Pas d\'échec.', category: 'doigts', needs: ['poutre'], intensity: 3, sets: 5, work: 10, rest: 120 },
  { id: 'hang-leger', name: 'Suspensions longues faciles', cue: 'Grosse prise, 20 s confortables, épaules actives.', category: 'doigts', needs: ['poutre'], intensity: 2, sets: 4, work: 20, rest: 60 },
  { id: 'ext-doigts', name: 'Extensions des doigts', cue: 'Élastique autour des doigts, ouvre la main en grand, lentement.', category: 'doigts', needs: ['elastique'], intensity: 1, sets: 2, reps: 20, rest: 20, perSide: true },
  { id: 'poignet-flex', name: 'Flexions de poignet à la serviette', cue: 'Essore une serviette roulée fort, dans un sens puis dans l\'autre.', category: 'doigts', needs: [], intensity: 1, sets: 3, work: 30, rest: 30 },

  // ---------- Jambes et hanches ----------
  { id: 'squat', name: 'Squats', cue: 'Pieds largeur d\'épaules, descends cuisses parallèles, talons au sol.', category: 'jambes', needs: [], intensity: 1, sets: 3, reps: 15, rest: 30 },
  { id: 'fentes', name: 'Fentes', cue: 'Grand pas en avant, genou arrière proche du sol.', category: 'jambes', needs: [], intensity: 2, sets: 2, reps: 10, rest: 30, perSide: true },
  { id: 'pont', name: 'Pont fessier', cue: 'Sur le dos, pousse dans les talons et monte le bassin, serre en haut.', category: 'jambes', needs: [], intensity: 1, sets: 3, reps: 15, rest: 30 },
  { id: 'pistol', name: 'Squat sur une jambe assisté', cue: 'Tiens-toi à un meuble, descends sur une jambe lentement.', category: 'jambes', needs: [], intensity: 3, sets: 3, reps: 5, rest: 45, perSide: true },
  { id: 'high-step', name: 'Montées de pied haut', cue: 'Pose le pied sur une chaise et monte dessus sans élan, comme un pas haut en grimpe.', category: 'jambes', needs: [], intensity: 2, sets: 2, reps: 8, rest: 30, perSide: true },

  // ---------- Mobilité / retour au calme ----------
  { id: 'avant-bras', name: 'Étirement des avant-bras', cue: 'Bras tendu, tire doucement les doigts vers toi, paume vers le haut puis vers le bas.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 30, rest: 5, perSide: true },
  { id: 'grenouille', name: 'Grenouille', cue: 'À quatre pattes, écarte les genoux au maximum, recule le bassin.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 60, rest: 0 },
  { id: 'pigeon', name: 'Pigeon', cue: 'Une jambe pliée devant, l\'autre tendue derrière, bassin vers le sol.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 45, rest: 5, perSide: true },
  { id: 'papillon', name: 'Papillon', cue: 'Assis, plantes de pieds collées, laisse tomber les genoux.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'squat-profond', name: 'Squat profond tenu', cue: 'Descends tout en bas, coudes poussant les genoux vers l\'extérieur.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'ouverture-thorax', name: 'Ouverture thoracique', cue: 'Allongé sur le côté, genoux pliés, ouvre le bras du dessus vers l\'arrière.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 30, rest: 5, perSide: true },
  { id: 'pec-porte', name: 'Étirement des pectoraux', cue: 'Avant-bras contre un cadre de porte, avance doucement le buste.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 30, rest: 5, perSide: true },
  { id: 'enfant', name: 'Posture de l\'enfant', cue: 'Fesses sur les talons, bras loin devant, respire lentement.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 45, rest: 0 },
  { id: 'dorsaux', name: 'Étirement des dorsaux', cue: 'Mains sur une table, recule le bassin et laisse descendre la poitrine.', category: 'mobilite', needs: [], intensity: 1, sets: 1, work: 40, rest: 0 },
]
