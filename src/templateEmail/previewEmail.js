const ejs = require('ejs');
const fs = require('fs');

// Genera un código aleatorio de 6 dígitos
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationCode = generateVerificationCode();
const template = fs.readFileSync('registerEmail.ejs', 'utf-8');

// Renderiza la plantilla
const html = ejs.render(template, { verificationCode });

// Guarda el resultado en un archivo HTML
fs.writeFileSync('email-preview.html', html);

console.log('Vista previa generada como email-preview.html con código:', verificationCode);