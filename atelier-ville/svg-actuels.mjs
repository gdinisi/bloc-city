// Atelier ville — exporte les dessins SVG actuels de la ville (sans toucher à l'appli)
// node atelier-ville/svg-actuels.mjs   → atelier-ville/apercu/actuel-<id>.svg
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const IDS = ['maison-bleue', 'boulangerie', 'gratte-ciel']
const vite = await createServer({ root: path.join(HERE, '..'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const React = (await import('react')).default
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { BuildingThumb } = await vite.ssrLoadModule('/src/city/iso.tsx')
  const { BUILDINGS } = await vite.ssrLoadModule('/src/city/buildings.ts')
  fs.mkdirSync(path.join(HERE, 'apercu'), { recursive: true })
  for (const id of IDS) {
    const b = BUILDINGS.find((x) => x.id === id)
    const svg = renderToStaticMarkup(React.createElement(BuildingThumb, { b, size: 200 }))
      .replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    fs.writeFileSync(path.join(HERE, 'apercu', `actuel-${id}.svg`), svg)
    console.log(id, svg.length)
  }
} finally {
  await vite.close()
}
