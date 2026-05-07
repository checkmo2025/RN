import type { ClubParticipantTypeCode } from '../../services/api/clubApi';

export const PARTICIPANT_CODE_TO_LABEL: Record<ClubParticipantTypeCode, string> = {
  STUDENT: '대학생',
  WORKER: '직장인',
  ONLINE: '온라인',
  CLUB: '동아리',
  MEETING: '모임',
  OFFLINE: '오프라인',
};

export const PARTICIPANT_LABEL_TO_CODE = Object.fromEntries(
  Object.entries(PARTICIPANT_CODE_TO_LABEL).map(([code, label]) => [label, code as ClubParticipantTypeCode]),
) as Record<string, ClubParticipantTypeCode>;
