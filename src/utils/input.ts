import { showToast } from './toast';

export function withLimitToast(
  onChange: (text: string) => void,
  maxLength: number,
): (text: string) => void {
  return (text: string) => {
    onChange(text);
    if (text.length >= maxLength) {
      showToast(`최대 ${maxLength}자까지 입력할 수 있습니다.`);
    }
  };
}
