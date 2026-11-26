// Atelier ville — génère catalogue.html : tous les éléments de l'appli, rendus Blender, 2 orientations.
// node atelier-ville/catalogue.mjs   (lit src/city/buildings.ts et apercu/batiments/)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const src = fs.readFileSync(path.join(HERE, '..', 'src', 'city', 'buildings.ts'), 'utf8')
// valeur entre apostrophes, jusqu'à l'apostrophe suivie d'une virgule (gère « d\'escalade »)
const champ = (l, k) => (l.match(new RegExp(`${k}: '(.*?)'(?=,| })`)) ?? [])[1]?.split(String.fromCharCode(92)).join('')
const items = src.split('\n').filter((l) => l.includes("{ id: '") && l.includes('rarity:')).map((l) => ({
  id: champ(l, 'id'), name: champ(l, 'name'), rarity: champ(l, 'rarity'), cat: champ(l, 'cat'), size: Number((l.match(/size: (\d)/) ?? [])[1] ?? 1),
}))
const CATS = { maisons: 'Maisons', commerces: 'Commerces', parcs: 'Parcs & nature', escalade: 'Escalade', monuments: 'Monuments', merveilles: 'Merveilles' }
const RAR = { commun: ['Commun', '#7a8597'], rare: ['Rare', '#2f80ed'], epique: ['Épique', '#9b51e0'], legendaire: ['Légendaire', '#f2994a'], merveille: ['Merveille', '#d4a106'] }
const dir = path.join(HERE, 'apercu', 'batiments')
const ok = (f) => fs.existsSync(path.join(dir, f))
let html = ''
for (const [cat, label] of Object.entries(CATS)) {
  html += `<h2>${label}</h2><div class="grille">`
  for (const b of items.filter((i) => i.cat === cat)) {
    const [rl, rc] = RAR[b.rarity]
    const img = (s) => (ok(`${b.id}-${s}.webp`) ? `<img loading="lazy" src="apercu/batiments/${b.id}-${s}.webp" alt="">` : '<div class="vide">à venir</div>')
    html += `<article class="${b.rarity}"><div class="duo">${img('g')}${img('d')}</div><b>${b.name}</b><span style="color:${rc}">${rl}${b.size > 1 ? ` · ${b.size}×${b.size}` : ''}</span></article>`
  }
  html += '</div>'
}
fs.writeFileSync(path.join(HERE, 'catalogue.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Catalogue ville</title>
<style>
:root{--bg:#0d0e10;--card:#17191d;--txt:#f2f2f2;--muted:#9aa0a6;--accent:#f0782d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.4 system-ui,-apple-system,sans-serif}
main{max-width:1100px;margin:0 auto;padding:18px 16px 40px}h1{font-size:24px;margin:0 0 4px}h2{font-size:17px;margin:26px 0 10px;color:var(--accent)}
p{color:var(--muted);font-size:13px;margin:0 0 6px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
article{background:var(--card);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:2px}
article.merveille{grid-column:span 2;border:1px solid #d4a10655}article.legendaire{border:1px solid #f2994a44}
.duo{display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:end}.duo img{width:100%;display:block}
.vide{aspect-ratio:1;display:grid;place-items:center;color:var(--muted);font-size:12px;border:1px dashed #333;border-radius:8px}
article span{font-size:12px;font-weight:600}
@media (max-width:560px){article.merveille{grid-column:span 1}}
</style></head><body><main>
<h1>Catalogue de la ville</h1>
<p>Tous les éléments de l'appli rendus avec Blender, dans les deux sens de pose : façade à gauche · façade à droite.</p>
${html}
</main></body></html>`)
console.log(items.length, 'éléments')
