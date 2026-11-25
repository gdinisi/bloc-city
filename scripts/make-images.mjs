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
console.log('images ok')
