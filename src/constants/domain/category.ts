import { colors } from '../../theme';
import type { ClubCategoryCode } from '../../services/api/clubApi';

export const CATEGORY_CODE_TO_LABEL: Record<ClubCategoryCode, string> = {
  FICTION_POETRY_DRAMA: '소설/시/희곡',
  ESSAY: '에세이',
  HUMANITIES: '인문학',
  SOCIAL_SCIENCE: '사회과학',
  POLITICS_DIPLOMACY_DEFENSE: '정치/외교/국방',
  ECONOMY_MANAGEMENT: '경제/경영',
  SELF_DEVELOPMENT: '자기계발',
  HISTORY_CULTURE: '역사/문화',
  SCIENCE: '과학',
  COMPUTER_IT: '컴퓨터/IT',
  ART_POP_CULTURE: '예술/대중문화',
  TRAVEL: '여행',
  FOREIGN_LANGUAGE: '외국어',
  CHILDREN_BOOKS: '어린이/청소년',
  RELIGION_PHILOSOPHY: '종교/철학',
};

export const CATEGORY_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(CATEGORY_CODE_TO_LABEL).map(([code, label]) => [label, code as ClubCategoryCode]),
) as Record<string, ClubCategoryCode>;

export const CATEGORY_ORDER: ClubCategoryCode[] = [
  'FICTION_POETRY_DRAMA',
  'ESSAY',
  'HUMANITIES',
  'SOCIAL_SCIENCE',
  'POLITICS_DIPLOMACY_DEFENSE',
  'ECONOMY_MANAGEMENT',
  'SELF_DEVELOPMENT',
  'HISTORY_CULTURE',
  'SCIENCE',
  'COMPUTER_IT',
  'ART_POP_CULTURE',
  'TRAVEL',
  'FOREIGN_LANGUAGE',
  'CHILDREN_BOOKS',
  'RELIGION_PHILOSOPHY',
];

export const CATEGORY_OPTIONS: Array<{ label: string; code: ClubCategoryCode }> =
  CATEGORY_ORDER.map((code) => ({ code, label: CATEGORY_CODE_TO_LABEL[code] }));

export const CATEGORY_CHIP_COLOR: Record<ClubCategoryCode, string> = {
  TRAVEL: colors.secondary2,
  FOREIGN_LANGUAGE: colors.secondary2,
  CHILDREN_BOOKS: colors.secondary2,
  RELIGION_PHILOSOPHY: colors.secondary2,
  FICTION_POETRY_DRAMA: colors.secondary1,
  ESSAY: colors.secondary1,
  HUMANITIES: colors.secondary1,
  SCIENCE: colors.secondary3,
  COMPUTER_IT: colors.secondary3,
  ECONOMY_MANAGEMENT: colors.secondary3,
  SELF_DEVELOPMENT: colors.secondary3,
  SOCIAL_SCIENCE: colors.secondary4,
  POLITICS_DIPLOMACY_DEFENSE: colors.secondary4,
  HISTORY_CULTURE: colors.secondary4,
  ART_POP_CULTURE: colors.secondary4,
};
