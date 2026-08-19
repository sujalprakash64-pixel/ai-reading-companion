// Zips the built dist/ into an installable, versioned extension package.
// Assumes `npm run build` has already produced dist/.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

if (!existsSync('dist/manifest.json')) {
  console.error('dist/ not built. Run `npm run build` first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const out = `ai-reading-companion-v${version}.zip`;
rmSync(out, { force: true });

// -r recurse, -FS sync (remove stale entries), exclude dotfiles.
execSync(`cd dist && zip -r -FS "../${out}" . -x ".*"`, { stdio: 'inherit' });
console.log(`\nPackaged ${out}`);
