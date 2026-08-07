const ejs = require('ejs');
const fs = require('fs');

// Genera un código aleatorio de 6 dígitos
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const verificationCode = generateVerificationCode();

// Datos de ejemplo para la vista previa
const nombreCompleto = 'Juan Pérez';
const resetUrl = 'https://portaqr.com/reset-password/123456';
const template = fs.readFileSync('passwordReset.ejs', 'utf-8');

// Renderiza la plantilla
const html = ejs.render(template, { 
  user: { name: nombreCompleto },
  resetUrl,
  verificationCode
});

// Guarda el resultado en un archivo HTML
fs.writeFileSync('email-preview-reset.html', html);

console.log('Vista previa generada como email-preview.html con código:', verificationCode);