// Photos de l'app (fond d'accueil, bandeaux) tirées de assets/icon-source.webp.
// Lancer : node scripts/make-images.mjs
import sharp from 'sharp'

const SRC = 'assets/icon-source.webp'

// Bandeau d'accueil : lune + sommet, format large
await sharp(SRC).extract({ left: 0, top: 160, width: 736, height: 470 }).resize(900).webp({ quality: 78 }).toFile('public/img/peak-wide.webp')
// Écran plein (connexion, amis) : toute la montagne
await sharp(SRC).extract({ left: 0, top: 120, width: 736, height: 900 }).resize(800).webp({ quality: 76 }).toFile('public/img/peak-tall.webp')
// Gros plan de la face éclairée (cartes)
await sharp(SRC).extract({ left: 300, top: 450, width: 436, height: 330 }).resize(600).webp({ quality: 78 }).toFile('public/img/face.webp')
// Bandeau de l'accueil : panorama des Dolomites au coucher du soleil (assets/home-source.webp)
await sharp('assets/home-source.webp').resize(1200).webp({ quality: 80 }).toFile('public/img/home-banner.webp')
// Séance « Complet » : grimpeur au sommet sous la lune (assets/focus-complet-source.png)
await sharp('assets/focus-complet-source.png').resize(700).webp({ quality: 80 }).toFile('public/img/focus-complet.webp')
// Séance « Gainage » : grimpeuse en veste rouge sur l'arête (assets/focus-gainage-source.webp)
await sharp('assets/focus-gainage-source.webp').resize(700).webp({ quality: 80 }).toFile('public/img/focus-gainage.webp')
// … et un recadrage serré sur la grimpeuse pour les petites cartes
await sharp('assets/focus-gainage-source.webp').extract({ left: 110, top: 430, width: 470, height: 600 }).resize(470).webp({ quality: 80 }).toFile('public/img/focus-gainage-card.webp')
// Séance « Haut du corps » : alpiniste sur l'arête enneigée au couchant (assets/focus-haut-source.webp)
await sharp('assets/focus-haut-source.webp').resize(700).webp({ quality: 80 }).toFile('public/img/focus-haut.webp')
await sharp('assets/focus-haut-source.webp').extract({ left: 200, top: 330, width: 420, height: 570 }).resize(420).webp({ quality: 80 }).toFile('public/img/focus-haut-card.webp')
console.log('images ok')
