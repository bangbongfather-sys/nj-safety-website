/**
 * 관리자 계정 만들기 — ADMIN_USERS 시크릿에 넣을 JSON 을 출력한다.
 *
 *   node scripts/make-admin-user.mjs
 *
 * 비밀번호는 이 컴퓨터를 벗어나지 않는다. 출력되는 것은 PBKDF2-SHA256
 * 해시라서 그것만으로는 비밀번호를 되돌릴 수 없다. Worker 의
 * verifyCredentials 가 같은 방식으로 다시 계산해 비교한다.
 *
 * 직원을 더 추가하려면 각자 실행해서 나온 객체들을 한 배열에 모으면 된다.
 */
import crypto from 'node:crypto';
import readline from 'node:readline';

/** Must match DEFAULT_ITERATIONS in worker/auth.ts. */
const ITERATIONS = 100000;

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (a) => { rl.close(); resolve(a); }));
}

/** Same as ask(), with the echo suppressed so the password never appears
 *  on screen or in the terminal scrollback. */
function askHidden(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    let muted = false;
    rl._writeToOutput = function (s) {
      if (!muted) rl.output.write(s);
    };
    rl.question(query, (a) => {
      rl.close();
      process.stdout.write('\n');
      resolve(a);
    });
    muted = true;
  });
}

const id = (await ask('아이디: ')).trim();
if (!id) {
  console.error('아이디를 입력해 주세요.');
  process.exit(1);
}

const pw = await askHidden('비밀번호 (8자 이상): ');
if (pw.length < 8) {
  console.error('비밀번호는 8자 이상으로 해주세요.');
  process.exit(1);
}
const pw2 = await askHidden('비밀번호 확인: ');
if (pw !== pw2) {
  console.error('두 비밀번호가 다릅니다. 처음부터 다시 실행해 주세요.');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(pw, salt, ITERATIONS, 32, 'sha256');

const user = {
  id,
  salt: salt.toString('base64'),
  hash: hash.toString('base64'),
  iterations: ITERATIONS,
};

console.log('');
console.log('아래 한 줄을 통째로 복사하세요 (비밀번호는 들어 있지 않습니다):');
console.log('');
console.log(JSON.stringify([user]));
console.log('');
console.log('그다음 이 명령을 실행하고, 위 한 줄을 붙여넣으세요:');
console.log('  npx wrangler secret put ADMIN_USERS');
console.log('');
