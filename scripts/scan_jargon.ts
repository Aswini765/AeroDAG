import fs from 'fs';
import path from 'path';

const consumerDir = path.resolve('src/components/consumer');
const forbiddenJargon = [
  'Deterministic Budget Tracker',
  'Booking State Machine',
  'Requirement Information States',
  'orchestrat',
  'Adaptive Planner',
  'Detecting Scope',
  'Natural Language Engine',
  'Deterministic budget cap',
  'Consultant Recommendations',
  'Financial Ceiling',
  'Pacing & Safety'
];

function scanDir(dir: string): number {
  const files = fs.readdirSync(dir);
  let hits = 0;
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      hits += scanDir(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (file === 'HowItWorksModal.tsx') continue; // Allowed on How it works page per Section 10
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const term of forbiddenJargon) {
          if (new RegExp(term, 'i').test(line)) {
            console.log(`HIT in ${path.relative(consumerDir, fullPath)}:${idx + 1} [${term}]: ${line.trim()}`);
            hits++;
          }
        }
      });
    }
  }
  return hits;
}

const totalHits = scanDir(consumerDir);
console.log(`\n========================================`);
console.log(`TOTAL JARGON HITS OUTSIDE HowItWorksModal: ${totalHits}`);
console.log(`========================================\n`);

if (totalHits > 0) {
  process.exit(1);
}
