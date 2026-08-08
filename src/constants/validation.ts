export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*]).{6,24}$/;
export const phoneRegex = /^01(?:0|1|[6-9])-(?:\d{3}|\d{4})-\d{4}$/;
export const nicknameRegex =
  /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]+$/u;
