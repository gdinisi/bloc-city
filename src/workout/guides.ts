export interface Guide {
  /** Muscles ou zones travaillés */
  muscles: string
  /** Déroulé pas à pas */
  steps: string[]
  /** Erreurs fréquentes */
  mistakes: string[]
  easier?: string
  harder?: string
  /** Recherche YouTube pour voir une vidéo */
  video: string
}

export const GUIDES: Record<string, Guide> = {
  // ---------- Échauffement ----------
  'rot-epaules': {
    muscles: 'Épaules, haut du dos',
    steps: ['Debout, pieds largeur de hanches, bras tendus sur les côtés.', 'Fais de grands cercles lents vers l\'avant pendant 15 s.', 'Inverse le sens 15 s, puis finis par des petits cercles rapides.'],
    mistakes: ['Hausser les épaules vers les oreilles', 'Aller trop vite au début'],
    video: 'rotation des épaules échauffement',
  },
  'chat-vache': {
    muscles: 'Colonne vertébrale, dos',
    steps: ['À quatre pattes : mains sous les épaules, genoux sous les hanches.', 'Inspire : creuse le dos, regarde devant (la vache).', 'Expire : enroule le dos vers le plafond, menton vers la poitrine (le chat).', 'Enchaîne lentement en suivant ta respiration.'],
    mistakes: ['Bouger seulement la tête', 'Plier les coudes'],
    video: 'cat cow stretch tutoriel',
  },
  poignets: {
    muscles: 'Poignets, avant-bras',
    steps: ['Fais 10 cercles de poignets dans chaque sens.', 'À quatre pattes, pose les mains au sol doigts tournés vers tes genoux.', 'Balance doucement le buste d\'avant en arrière pour étirer.'],
    mistakes: ['Forcer sur une douleur', 'Mettre tout le poids du corps d\'un coup'],
    video: 'échauffement poignets escalade',
  },
  'pompes-scap': {
    muscles: 'Dentelé, trapèzes, stabilité des omoplates',
    steps: ['Mets-toi en planche haute, bras tendus, corps gainé.', 'Sans plier les coudes, laisse la poitrine descendre : les omoplates se rapprochent.', 'Pousse le sol pour écarter les omoplates et arrondir légèrement le haut du dos.'],
    mistakes: ['Plier les coudes (ce n\'est pas une pompe)', 'Laisser tomber le bassin'],
    easier: 'Sur les genoux',
    video: 'scapular push up tutoriel',
  },
  jumping: {
    muscles: 'Cardio, mollets, épaules',
    steps: ['Debout, pieds joints, bras le long du corps.', 'Saute en écartant les pieds et en levant les bras au-dessus de la tête.', 'Saute pour revenir pieds joints, bras le long du corps. Garde un rythme régulier.'],
    mistakes: ['Atterrir sur les talons', 'Bloquer la respiration'],
    easier: 'Sans saut : écarte un pied après l\'autre',
    video: 'jumping jack tutoriel',
  },
  'pull-apart': {
    muscles: 'Arrière des épaules, haut du dos',
    steps: ['Tiens l\'élastique bras tendus devant toi, à hauteur d\'épaules.', 'Écarte les bras jusqu\'à ce que l\'élastique touche la poitrine.', 'Serre les omoplates 1 s, puis reviens lentement.'],
    mistakes: ['Plier les coudes', 'Cambrer le bas du dos'],
    video: 'band pull apart tutoriel',
  },
  'susp-legere': {
    muscles: 'Doigts, épaules (échauffement)',
    steps: ['Attrape la barre, pieds au sol ou sur une chaise.', 'Fléchis les jambes pour mettre une partie de ton poids dans les bras.', 'Garde les épaules actives (pas collées aux oreilles), respire.'],
    mistakes: ['Se suspendre d\'un coup avec tout le poids', 'Épaules relâchées'],
    video: 'suspension barre épaules actives',
  },

  // ---------- Gainage ----------
  planche: {
    muscles: 'Abdos, gainage complet',
    steps: ['Coudes sous les épaules, avant-bras au sol.', 'Tends les jambes, appuie sur la pointe des pieds.', 'Aligne tête, dos et talons ; serre les fessiers et le ventre.', 'Respire calmement pendant tout le temps de maintien.'],
    mistakes: ['Fesses trop hautes', 'Bassin qui s\'affaisse, dos creusé', 'Retenir sa respiration'],
    easier: 'Sur les genoux',
    harder: 'Lève un pied ou un bras',
    video: 'gainage planche bonne position',
  },
  'planche-lat': {
    muscles: 'Obliques, flancs, épaules',
    steps: ['Allongé sur le côté, coude sous l\'épaule.', 'Jambes tendues, pieds l\'un sur l\'autre.', 'Monte le bassin pour aligner chevilles, hanches et épaules.', 'Tiens, puis change de côté.'],
    mistakes: ['Bassin qui tombe', 'Corps qui bascule vers l\'avant'],
    easier: 'Genou du bas au sol',
    harder: 'Lève la jambe du dessus',
    video: 'planche latérale tutoriel',
  },
  hollow: {
    muscles: 'Abdos profonds (essentiel pour les dévers)',
    steps: ['Allongé sur le dos, plaque le bas du dos au sol.', 'Décolle les épaules, bras tendus derrière la tête.', 'Décolle les jambes tendues à environ 30 cm du sol.', 'Le corps forme une banane : tiens sans que le dos se décolle.'],
    mistakes: ['Bas du dos qui se creuse', 'Menton collé à la poitrine'],
    easier: 'Genoux pliés et bras le long du corps',
    harder: 'Jambes et bras plus bas, près du sol',
    video: 'hollow body hold tutoriel',
  },
  superman: {
    muscles: 'Bas du dos, fessiers, arrière des épaules',
    steps: ['Allongé sur le ventre, bras tendus devant.', 'Décolle en même temps bras, poitrine et jambes.', 'Regarde le sol pour garder la nuque neutre, tiens.'],
    mistakes: ['Lever la tête vers le plafond', 'Plier les genoux'],
    easier: 'Lève seulement le haut du corps',
    video: 'superman exercice dos',
  },
  'dead-bug': {
    muscles: 'Abdos profonds, coordination',
    steps: ['Sur le dos, bras tendus vers le plafond, genoux pliés à 90° au-dessus des hanches.', 'Allonge lentement un bras derrière la tête et la jambe opposée vers le sol.', 'Reviens et change de côté. Une répétition = un côté.'],
    mistakes: ['Dos qui se creuse quand la jambe descend', 'Aller trop vite'],
    easier: 'Bouge seulement les jambes',
    video: 'dead bug exercice tutoriel',
  },
  'bird-dog': {
    muscles: 'Gainage, bas du dos, équilibre',
    steps: ['À quatre pattes, dos plat.', 'Tends un bras devant et la jambe opposée derrière.', 'Tiens 2 s sans bouger le bassin, puis change de côté.'],
    mistakes: ['Bassin qui tourne', 'Lever la jambe trop haut et creuser le dos'],
    video: 'bird dog exercice',
  },
  mountain: {
    muscles: 'Abdos, cardio, épaules',
    steps: ['En planche haute, mains sous les épaules.', 'Ramène un genou vers la poitrine, puis l\'autre, en alternance rapide.', 'Garde les fesses à hauteur des épaules.'],
    mistakes: ['Fesses trop hautes', 'Mains en avant des épaules'],
    easier: 'Plus lentement, en posant le pied',
    video: 'mountain climbers tutoriel',
  },
  'planche-touch': {
    muscles: 'Gainage anti-rotation, épaules',
    steps: ['En planche haute, pieds un peu écartés.', 'Touche l\'épaule opposée avec une main.', 'Repose et change de main. Le bassin ne doit pas tourner.'],
    mistakes: ['Bassin qui se balance', 'Pieds trop serrés'],
    easier: 'Sur les genoux',
    video: 'plank shoulder taps tutoriel',
  },
  'releve-genoux': {
    muscles: 'Abdos, fléchisseurs de hanche, prise',
    steps: ['Suspendu à la barre, épaules actives.', 'Monte les genoux vers la poitrine en enroulant le bassin.', 'Redescends lentement sans te balancer.'],
    mistakes: ['Utiliser l\'élan', 'Lâcher la descente'],
    easier: 'Allongé au sol (relevés de jambes)',
    harder: 'Jambes tendues',
    video: 'hanging knee raise tutoriel',
  },
  'essuie-glace': {
    muscles: 'Obliques, abdos',
    steps: ['Allongé sur le dos, bras en croix au sol.', 'Lève les jambes à la verticale (pliées si besoin).', 'Descends-les doucement d\'un côté sans toucher le sol, remonte, puis de l\'autre côté.'],
    mistakes: ['Décoller les épaules du sol', 'Laisser tomber les jambes'],
    easier: 'Genoux pliés à 90°',
    harder: 'Jambes tendues',
    video: 'essuie glace abdos au sol',
  },

  // ---------- Tirage ----------
  'rowing-table': {
    muscles: 'Dos, biceps (tirage comme en grimpe)',
    steps: ['Vérifie que la table est très stable (contre un mur, lourde).', 'Allonge-toi dessous, attrape le bord avec les deux mains.', 'Corps gainé, talons au sol : tire la poitrine vers le plateau.', 'Redescends lentement bras tendus.'],
    mistakes: ['Table qui bascule : ne le fais pas sur une table légère', 'Bassin qui pend', 'Tirer avec le cou'],
    easier: 'Genoux pliés, pieds plus proches',
    harder: 'Pieds surélevés sur une chaise',
    video: 'inverted row sous une table',
  },
  tractions: {
    muscles: 'Dos, biceps, avant-bras',
    steps: ['Suspendu, mains en pronation (paumes vers l\'avant), largeur d\'épaules.', 'Abaisse les épaules puis tire jusqu\'à passer le menton au-dessus de la barre.', 'Redescends contrôlé jusqu\'aux bras tendus.'],
    mistakes: ['Demi-amplitude', 'Battements de jambes pour s\'aider'],
    easier: 'Tractions excentriques ou avec élastique',
    harder: 'Montée lente ou pause en haut',
    video: 'traction tutoriel débutant',
  },
  'tractions-exc': {
    muscles: 'Dos, biceps (force en descente)',
    steps: ['Monte en haut de la barre en sautant ou avec une chaise.', 'Menton au-dessus de la barre, descends le plus lentement possible (5 s).', 'Pose les pieds, remonte et recommence.'],
    mistakes: ['Lâcher en fin de descente', 'Descendre trop vite'],
    video: 'tractions négatives tutoriel',
  },
  'scap-pull': {
    muscles: 'Bas des trapèzes, stabilité des épaules',
    steps: ['Suspendu bras tendus, épaules relâchées.', 'Sans plier les coudes, tire les épaules vers le bas : le corps monte de quelques cm.', 'Relâche lentement.'],
    mistakes: ['Plier les bras', 'Se balancer'],
    video: 'scapular pull up tutoriel',
  },
  'tuck-lever': {
    muscles: 'Dorsaux, abdos, gainage (dévers)',
    steps: ['Suspendu, bras tendus.', 'Monte les genoux contre la poitrine et bascule le dos à l\'horizontale.', 'Pousse la barre vers les hanches avec les bras tendus, tiens.'],
    mistakes: ['Plier les bras', 'Dos qui reste vertical'],
    easier: 'Un pied sur une chaise',
    harder: 'Écarte un peu les genoux de la poitrine',
    video: 'tuck front lever tutoriel',
  },
  'tirage-elast': {
    muscles: 'Dos, arrière des épaules',
    steps: ['Accroche l\'élastique devant toi (poignée de porte fermée, pied de meuble).', 'Bras tendus, tire les coudes en arrière le long du corps.', 'Serre les omoplates, reviens lentement.'],
    mistakes: ['Hausser les épaules', 'Se pencher en arrière'],
    video: 'tirage élastique dos',
  },

  // ---------- Antagonistes ----------
  pompes: {
    muscles: 'Pectoraux, triceps (compense la grimpe)',
    steps: ['Mains un peu plus larges que les épaules, corps aligné.', 'Descends la poitrine près du sol, coudes à 45° du corps.', 'Pousse pour remonter bras tendus.'],
    mistakes: ['Bassin qui tombe', 'Coudes écartés à 90°', 'Demi-amplitude'],
    easier: 'Sur les genoux ou mains sur une table',
    harder: 'Pieds surélevés',
    video: 'pompes bonne technique',
  },
  'pompes-diamant': {
    muscles: 'Triceps, pectoraux',
    steps: ['Mains rapprochées sous la poitrine.', 'Descends en gardant les coudes collés au corps.', 'Pousse pour remonter.'],
    mistakes: ['Coudes qui s\'écartent', 'Poignets douloureux : écarte un peu les mains'],
    easier: 'Sur les genoux',
    video: 'pompes serrées triceps',
  },
  pike: {
    muscles: 'Épaules, triceps',
    steps: ['Mains au sol, fesses en l\'air : le corps forme un V inversé.', 'Plie les coudes pour descendre la tête vers le sol, entre les mains.', 'Pousse pour remonter.'],
    mistakes: ['Descendre la poitrine au lieu de la tête', 'Dos très arrondi'],
    easier: 'Mains surélevées sur une marche',
    harder: 'Pieds sur une chaise',
    video: 'pike push up tutoriel',
  },
  'dips-chaise': {
    muscles: 'Triceps, épaules',
    steps: ['Dos à une chaise stable, mains au bord de l\'assise.', 'Jambes devant toi, fesses près de la chaise.', 'Plie les coudes jusqu\'à 90°, puis pousse pour remonter.'],
    mistakes: ['Descendre trop bas (épaules qui tirent)', 'Coudes qui s\'écartent'],
    easier: 'Genoux pliés, pieds proches',
    harder: 'Jambes tendues',
    video: 'dips sur chaise tutoriel',
  },
  ytw: {
    muscles: 'Bas des trapèzes, coiffe des rotateurs',
    steps: ['Allongé sur le ventre, front posé sur une serviette.', 'Lève les bras en Y (pouces vers le ciel), tiens 2 s.', 'Puis en T, puis en W (coudes pliés, ramenés vers les côtes).'],
    mistakes: ['Lever la tête', 'Hausser les épaules'],
    video: 'Y T W exercise au sol',
  },
  'rot-ext': {
    muscles: 'Coiffe des rotateurs (prévention épaule)',
    steps: ['Tiens l\'élastique à deux mains, paumes vers le haut, mains écartées de la largeur des épaules.', 'Coudes collés au corps, pliés à 90°, mains devant toi.', 'Écarte les mains vers l\'extérieur en gardant les coudes collés, puis reviens lentement.'],
    mistakes: ['Décoller le coude', 'Élastique trop dur'],
    video: 'rotation externe élastique épaule',
  },
  'face-pull': {
    muscles: 'Arrière des épaules, coiffe des rotateurs',
    steps: ['Élastique accroché à hauteur des yeux.', 'Tire vers ton visage en montant les coudes haut et larges.', 'Finis pouces vers l\'arrière, reviens lentement.'],
    mistakes: ['Coudes trop bas', 'Se pencher en arrière'],
    video: 'face pull élastique tutoriel',
  },

  // ---------- Doigts ----------
  repeaters: {
    muscles: 'Fléchisseurs des doigts, endurance de force',
    steps: ['Choisis une prise de la poutre où tu tiens 10 à 12 s au maximum.', '7 s suspendu bras légèrement fléchis, épaules actives.', '3 s de pause, puis recommence : 6 fois de suite = 1 tour.', 'Récupère 2 à 3 min entre les tours.'],
    mistakes: ['S\'échauffer trop peu : jamais à froid', 'Continuer malgré une douleur aux doigts', 'Prise trop petite'],
    easier: 'Pieds sur une chaise pour alléger',
    video: 'repeaters 7/3 hangboard',
  },
  'max-hang': {
    muscles: 'Force maximale des doigts',
    steps: ['Prise exigeante où tu tiens environ 12 s.', 'Suspends-toi 10 s, bras légèrement fléchis.', 'Repos complet de 2 min entre les essais. Ne va jamais à l\'échec.'],
    mistakes: ['Pas d\'échauffement', 'Moins de 2 min de repos', 'Prise en arqué forcé'],
    easier: 'Pieds sur une chaise',
    video: 'max hangs poutre tutoriel',
  },
  'hang-leger': {
    muscles: 'Doigts, tendons (volume léger)',
    steps: ['Grosse prise confortable.', 'Tiens 20 s, épaules actives, respire.', 'Repos 1 min entre les séries.'],
    mistakes: ['Prise trop petite pour la durée'],
    video: 'suspension poutre débutant',
  },
  'ext-doigts': {
    muscles: 'Extenseurs des doigts (prévention des blessures)',
    steps: ['Passe un élastique autour du bout de tous les doigts.', 'Ouvre la main en grand contre la résistance.', 'Referme lentement. Fais une main puis l\'autre.'],
    mistakes: ['Aller trop vite', 'Élastique trop dur'],
    video: 'finger extensors rubber band',
  },
  'poignet-flex': {
    muscles: 'Avant-bras, poignets',
    steps: ['Roule une serviette et tiens-la à deux mains devant toi.', 'Essore-la fort en tournant les mains en sens opposés.', 'Change de sens à mi-temps.'],
    mistakes: ['Hausser les épaules'],
    video: 'towel wringing avant bras',
  },

  // ---------- Jambes ----------
  squat: {
    muscles: 'Cuisses, fessiers',
    steps: ['Pieds largeur d\'épaules, pointes légèrement ouvertes.', 'Descends en poussant les fesses en arrière, bras devant.', 'Cuisses parallèles au sol, talons au sol, puis remonte.'],
    mistakes: ['Genoux qui rentrent vers l\'intérieur', 'Talons qui décollent'],
    harder: 'Sauts en fin de mouvement',
    video: 'squat technique débutant',
  },
  fentes: {
    muscles: 'Cuisses, fessiers, équilibre',
    steps: ['Debout, fais un grand pas en avant.', 'Descends jusqu\'à ce que le genou arrière frôle le sol.', 'Pousse sur la jambe avant pour revenir.'],
    mistakes: ['Genou avant qui dépasse beaucoup le pied', 'Buste penché'],
    video: 'fentes avant technique',
  },
  pont: {
    muscles: 'Fessiers, ischios',
    steps: ['Sur le dos, genoux pliés, pieds à plat près des fesses.', 'Pousse dans les talons pour monter le bassin.', 'Serre les fessiers en haut 1 s, redescends.'],
    mistakes: ['Cambrer le bas du dos', 'Pousser sur la pointe des pieds'],
    harder: 'Sur une jambe',
    video: 'pont fessier technique',
  },
  pistol: {
    muscles: 'Cuisses, équilibre, mobilité de cheville',
    steps: ['Debout sur une jambe, tiens-toi à un meuble.', 'Tends l\'autre jambe devant toi.', 'Descends lentement le plus bas possible, remonte en t\'aidant un peu des bras.'],
    mistakes: ['Talon qui décolle', 'Genou qui part vers l\'intérieur'],
    easier: 'Descendre jusqu\'à s\'asseoir sur une chaise',
    video: 'pistol squat assisté',
  },
  'high-step': {
    muscles: 'Cuisses, fessiers (pas hauts en grimpe)',
    steps: ['Pose un pied sur une chaise stable.', 'Monte dessus en poussant uniquement sur cette jambe, sans élan.', 'Redescends lentement, 8 fois puis change de jambe.'],
    mistakes: ['Pousser avec le pied resté au sol', 'Chaise qui glisse'],
    easier: 'Marche plus basse',
    video: 'step up sans élan',
  },

  // ---------- Mobilité ----------
  'avant-bras': {
    muscles: 'Fléchisseurs et extenseurs des avant-bras',
    steps: ['Bras tendu devant, paume vers le haut.', 'Avec l\'autre main, tire doucement les doigts vers toi : 15 s.', 'Retourne la paume vers le bas et tire le dos de la main : 15 s. Change de bras.'],
    mistakes: ['Tirer fort jusqu\'à la douleur'],
    video: 'étirement avant bras escalade',
  },
  grenouille: {
    muscles: 'Adducteurs, hanches (genoux près du mur)',
    steps: ['À quatre pattes sur les avant-bras.', 'Écarte les genoux le plus possible, pieds en dehors.', 'Recule doucement le bassin vers les talons et respire.'],
    mistakes: ['Forcer d\'un coup', 'Dos très creusé'],
    video: 'frog stretch tutoriel',
  },
  pigeon: {
    muscles: 'Fessiers, rotateurs de hanche',
    steps: ['Une jambe pliée devant toi, tibia en travers.', 'L\'autre jambe tendue derrière.', 'Garde le bassin droit, puis penche le buste vers l\'avant. Change de côté.'],
    mistakes: ['Bassin qui bascule sur le côté', 'Douleur au genou : ramène le pied vers toi'],
    video: 'pigeon pose étirement',
  },
  papillon: {
    muscles: 'Adducteurs, hanches',
    steps: ['Assis, plantes de pieds collées, talons près du bassin.', 'Laisse tomber les genoux vers le sol.', 'Dos droit, penche-toi un peu en avant si c\'est facile.'],
    mistakes: ['Dos arrondi', 'Appuyer fort sur les genoux'],
    video: 'butterfly stretch',
  },
  'squat-profond': {
    muscles: 'Hanches, chevilles',
    steps: ['Descends en squat tout en bas, talons au sol.', 'Mains jointes, pousse les genoux vers l\'extérieur avec les coudes.', 'Garde le dos le plus droit possible et respire.'],
    mistakes: ['Talons qui décollent : mets un livre dessous'],
    video: 'deep squat hold mobilité',
  },
  'ouverture-thorax': {
    muscles: 'Haut du dos, pectoraux',
    steps: ['Allongé sur le côté, genoux pliés à 90°, bras tendus devant toi l\'un sur l\'autre.', 'Ouvre le bras du dessus en arc de cercle vers l\'arrière, en suivant la main du regard.', 'Garde les genoux collés au sol, reviens. Change de côté.'],
    mistakes: ['Genoux qui se décollent'],
    video: 'open book stretch thoracique',
  },
  'pec-porte': {
    muscles: 'Pectoraux, avant des épaules',
    steps: ['Pose l\'avant-bras contre le cadre d\'une porte, coude à hauteur d\'épaule.', 'Avance doucement le buste jusqu\'à sentir l\'étirement.', 'Tiens, puis change de côté.'],
    mistakes: ['Pousser jusqu\'à la douleur dans l\'épaule'],
    video: 'étirement pectoraux cadre de porte',
  },
  enfant: {
    muscles: 'Dos, épaules, récupération',
    steps: ['À genoux, assieds-toi sur les talons.', 'Allonge les bras loin devant et pose le front au sol.', 'Respire lentement par le ventre.'],
    mistakes: ['Garder les épaules crispées'],
    video: 'posture de l\'enfant yoga',
  },
  dorsaux: {
    muscles: 'Dorsaux, épaules',
    steps: ['Mains posées sur une table, bras tendus.', 'Recule les pieds et pousse les fesses en arrière.', 'Laisse descendre la poitrine vers le sol, tiens.'],
    mistakes: ['Dos rond', 'Genoux bloqués'],
    video: 'étirement dorsaux table',
  },
}

export const videoUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
