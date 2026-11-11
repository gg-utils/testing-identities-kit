import { execFileSync } from 'node:child_process';
const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'dist'], { encoding: 'utf8' });
if (untracked.trim()) { console.error('Untracked build output:', untracked); process.exit(1); }
