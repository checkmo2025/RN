import { AutomationAuthError, authenticatedApiRequest } from '../book-story-automation/auth-client.mjs';
import { resolveRequesterEmail } from './news-client.mjs';

async function main() {
  const payload = await authenticatedApiRequest('/admin/news?page=0', { method: 'GET' });
  if (!Array.isArray(payload?.result?.basicInfoList)) {
    throw new AutomationAuthError('관리자 소식 목록 응답 형식을 확인하지 못했습니다.');
  }
  await resolveRequesterEmail();
  console.log('소식 관리자 API 권한이 정상입니다.');
  console.log('로그인 계정과 소식 작성자 연결이 정상입니다.');
  console.log('비밀번호나 토큰 값은 읽어 표시하지 않았습니다.');
}

main().catch((error) => {
  const message =
    error instanceof AutomationAuthError ? error.message : '소식 API 점검 중 오류가 발생했습니다.';
  console.error(`오류: ${message}`);
  process.exitCode = 1;
});
