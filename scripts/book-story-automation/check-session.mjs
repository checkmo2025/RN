import {
  authProfileDisplayName,
  authProfileFromArgs,
  AutomationAuthError,
  readRefreshToken,
  refreshSession,
  saveRefreshToken,
  verifyLoginStatus,
} from './auth-client.mjs';

const HELP = `책모 책이야기 자동화 세션 점검

사용법:
  npm run book-story:session -- --profile admin
  npm run book-story:session -- --profile emotion

macOS 키체인에 저장된 갱신 토큰을 회전하고 로그인 상태를 확인합니다.
토큰 값은 출력하지 않습니다.`;

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  const profile = authProfileFromArgs(process.argv.slice(2));
  const profileName = authProfileDisplayName(profile);
  const refreshToken = readRefreshToken(profile);
  const { accessToken, nextRefreshToken } = await refreshSession(refreshToken);

  // 서버에서 토큰이 회전되었으므로 로그인 상태 확인보다 먼저 새 토큰을 보관한다.
  saveRefreshToken(nextRefreshToken, profile);
  await verifyLoginStatus(accessToken);

  console.log(`책모 ${profileName} 계정 로그인 세션이 정상입니다.`);
  console.log('회전된 갱신 토큰을 macOS 키체인에 안전하게 저장했습니다.');
}

main().catch((error) => {
  const message =
    error instanceof AutomationAuthError ? error.message : '세션 점검 중 오류가 발생했습니다.';
  console.error(`오류: ${message}`);
  console.error('필요하면 해당 프로필로 book-story:login 명령을 다시 실행해 주세요.');
  process.exitCode = 1;
});
