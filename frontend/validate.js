// Quick validation of component syntax
const fs = require('fs');

const files = [
  'src/components/patient/LabReportsViewer.tsx',
  'src/app/dashboard/lab_tech/page.tsx',
  'src/components/operations/TestQueue.tsx'
];

let hasErrors = false;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for common React issues
  const issues = [];
  
  // Check if imports match exports
  if (content.includes('import') && !content.includes('export')) {
    issues.push('Missing export');
  }
  
  // Check for unclosed JSX
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  // Check for PDFViewer usage
  if (content.includes('PDFViewer')) {
    if (!content.includes('fileUrl') || !content.includes('fileName') || !content.includes('onClose')) {
      issues.push('PDFViewer missing required props');
    }
  }
  
  if (issues.length > 0) {
    console.log(`\n❌ ${file}:`);
    issues.forEach(issue => console.log(`   - ${issue}`));
    hasErrors = true;
  } else {
    console.log(`✅ ${file}`);
  }
});

if (!hasErrors) {
  console.log('\n✅ All files pass basic validation');
} else {
  process.exit(1);
}
