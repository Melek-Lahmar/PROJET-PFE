const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%; font-size:8px; color:#94a3b8; font-family:'Segoe UI',sans-serif;
                  display:flex; justify-content:space-between; padding:0 15mm; box-sizing:border-box;">
        <span>Rapport d'Audit Technique — Projet PFE</span>
        <span>${new Date().toLocaleDateString('fr-FR')}</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%; font-size:8px; color:#94a3b8; font-family:'Segoe UI',sans-serif;
                  display:flex; justify-content:space-between; padding:0 15mm; box-sizing:border-box;">
        <span>Confidentiel</span>
        <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
  });

  await browser.close();
  console.log(`PDF generated: ${outputPath}`);
}

// Load HTML and generate
const htmlPath = path.join(__dirname, 'rapport.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const outputPath = path.join(__dirname, 'Rapport_Audit_Technique_PFE.pdf');

generatePDF(htmlContent, outputPath).catch(console.error);
