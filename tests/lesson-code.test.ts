import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The code in a lesson is the code in the repo, or the suite fails.
 *
 * Before this check existed, 84 of the 91 code blocks of phase 1 were paraphrases: functions that
 * had been rewritten for the lesson, Spanish docstrings where the repo has English ones, and two
 * blocks citing `src/rukh/eval/metrics.py`, a file that never existed. A reader who typed what the
 * course showed did not get `rukh`; they got something that looked like it.
 *
 * `scripts/course-code.mjs verify` checks every block against the file it claims to be, at the tag
 * its module closed with. It needs the sibling clone (`../rukh`), so it is skipped — not failed —
 * when this repo is checked out alone, which is what CI does.
 */
const root = resolve(__dirname, '..');
const haveRukh = existsSync(resolve(root, '../rukh/.git'));

describe('code blocks in lessons', () => {
  /* 1 400 citations, each resolved with a `git show` against the tag it cites: well past the
     five-second default, and the check is worth the wall clock. */
  it.runIf(haveRukh).concurrent(
    'are the files they claim to be, verbatim, at the module tag',
    () => {
      let output: string;
      try {
        output = execFileSync('node', ['scripts/course-code.mjs', 'verify'], {
          cwd: root,
          encoding: 'utf8',
        });
      } catch (error) {
        const failure = error as { stdout?: string; stderr?: string };
        expect.fail(`${failure.stdout ?? ''}${failure.stderr ?? ''}`);
      }
      expect(output).toContain('verbatim');
    },
    120_000,
  );
});
