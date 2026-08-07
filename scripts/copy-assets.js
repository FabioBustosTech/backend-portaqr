// Copia assets estáticos (templateEmail) a dist/ en el build.
// Reemplaza el `cp -r` de user-service por un script Windows-friendly.
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'templateEmail');
const distDir = path.join(__dirname, '..', 'dist', 'templateEmail');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`[copy-assets] Origen no existe, se omite: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(srcDir, distDir);
console.log(`[copy-assets] templateEmail copiado a ${distDir}`);