import { createInterface } from 'node:readline/promises';

import {
  authProfileDisplayName,
  authProfileFromArgs,
  AutomationAuthError,
  loginWithIdentifier,
  saveRefreshToken,
} from './auth-client.mjs';

const HELP = `책모 책이야기 자동화 로그인 설정

사용법:
  npm run book-story:login -- --profile admin
  npm run book-story:login -- --profile emotion

프로필:
  admin    관리자 소개글 게시 계정 (기본값)
  emotion  감성회원 글 게시 계정

아이디와 비밀번호는 터미널에서 직접 입력합니다.
비밀번호는 화면에 표시되지 않으며 파일이나 Git에 저장하지 않습니다.
로그인 성공 후 갱신 토큰만 macOS 키체인에 저장합니다.`;

function promptHidden(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    throw new AutomationAuthError('비밀번호 숨김 입력을 위해 대화형 터미널이 필요합니다.');
  }

  process.stdout.write(label);
  process.stdin.setEncoding('utf8');
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new AutomationAuthError('로그인 설정을 취소했습니다.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }

        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }

        if (character >= ' ') value += character;
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  if (process.platform !== 'darwin') {
    throw new AutomationAuthError('이 로그인 도구는 macOS에서만 사용할 수 있습니다.');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new AutomationAuthError('로그인 정보는 대화형 터미널에서 직접 입력해 주세요.');
  }

  const profile = authProfileFromArgs(process.argv.slice(2));
  const profileName = authProfileDisplayName(profile);

  console.log(`책모 자동화용 ${profileName} 계정 로그인을 설정합니다.`);
  console.log('입력한 비밀번호는 화면이나 파일에 남지 않습니다.\n');

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const identifier = (await readline.question('책모 아이디 또는 이메일: ')).trim();
  readline.close();

  let password = await promptHidden('책모 비밀번호: ');
  try {
    const refreshToken = await loginWithIdentifier(identifier, password);
    saveRefreshToken(refreshToken, profile);
  } finally {
    password = '';
  }

  console.log(`${profileName} 계정 로그인 설정이 완료되었습니다.`);
  console.log('갱신 토큰은 macOS 키체인에만 저장되었습니다.');
  console.log(
    `다음 명령으로 세션을 점검할 수 있습니다: npm run book-story:session -- --profile ${profile}`,
  );
}

main().catch((error) => {
  const message =
    error instanceof AutomationAuthError ? error.message : '로그인 설정 중 오류가 발생했습니다.';
  console.error(`오류: ${message}`);
  process.exitCode = 1;
});
