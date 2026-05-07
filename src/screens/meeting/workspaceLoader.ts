import {
  fetchClubBookshelves,
  fetchClubHome,
  fetchClubLatestNotice,
  fetchClubMyMembership,
  fetchClubNotices,
  fetchClubDetail,
  fetchClubMembers,
  type ClubBookshelfItem,
} from '../../services/api/clubApi';
import { ApiError } from '../../services/api/http';
import {
  mapManagedClubDetailToGroup,
  mapApiBookshelfToItem,
  mapNoticePreviewToNoticeItem,
  sortNoticeItems,
  mapClubManagedMemberToJoinRequest,
  mapClubManagedMemberToGroupMember,
  toEditDraft,
} from './helpers';
import { mapClubStatusToApplication } from './mappers';
import type {
  Group,
  WorkspaceSnapshot,
} from './types';

const BOOKSHELF_CURSOR_LOOP_LIMIT = 100;

export async function fetchAllClubBookshelvesWithCursor(clubId: number): Promise<{
  items: ClubBookshelfItem[];
  isStaff: boolean;
}> {
  const mergedItems: ClubBookshelfItem[] = [];
  const seenMeetingIds = new Set<number>();
  const visitedCursors = new Set<number>();
  let cursorId: number | undefined;
  let isStaff = false;

  for (let page = 0; page < BOOKSHELF_CURSOR_LOOP_LIMIT; page += 1) {
    const response = await fetchClubBookshelves(clubId, cursorId);
    if (response.isStaff) isStaff = true;

    response.items.forEach((item) => {
      if (seenMeetingIds.has(item.meetingId)) return;
      seenMeetingIds.add(item.meetingId);
      mergedItems.push(item);
    });

    if (!response.hasNext || typeof response.nextCursor !== 'number') break;
    if (visitedCursors.has(response.nextCursor)) break;

    visitedCursors.add(response.nextCursor);
    cursorId = response.nextCursor;
  }

  return { items: mergedItems, isStaff };
}

async function fetchAllClubNotices(clubId: number) {
  const first = await fetchClubNotices(clubId, 1);
  if (!first.hasNext) return first;
  const allNormal = [...first.normalNotices];
  for (let p = 2; p <= Math.min(first.totalPages, 20); p++) {
    const more = await fetchClubNotices(clubId, p);
    allNormal.push(...more.normalNotices);
    if (!more.hasNext) break;
  }
  return { ...first, normalNotices: allNormal };
}

export async function fetchClubWorkspaceData(
  clubId: number,
  prevGroup: Group,
  isLoggedIn: boolean,
): Promise<WorkspaceSnapshot> {
  const [homeDetail, bookshelfList, noticeList, latestNotice, myMembership] = await Promise.all([
    fetchClubHome(clubId),
    fetchAllClubBookshelvesWithCursor(clubId),
    fetchAllClubNotices(clubId),
    fetchClubLatestNotice(clubId, { suppressErrorToast: true }),
    isLoggedIn
      ? fetchClubMyMembership(clubId, { suppressErrorToast: true }).catch((e: unknown) => {
          if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null;
          throw e;
        })
      : Promise.resolve(null),
  ]);

  const canManageClub =
    myMembership?.myStatus === 'STAFF' ||
    myMembership?.myStatus === 'OWNER' ||
    myMembership?.staff === true ||
    Boolean(bookshelfList.isStaff);

  const latestNoticeId = typeof latestNotice?.id === 'number' ? latestNotice.id : null;

  let managedGroup = homeDetail
    ? mapManagedClubDetailToGroup(homeDetail, prevGroup)
    : prevGroup;
  managedGroup = {
    ...managedGroup,
    notice: latestNotice?.title,
    applicationStatus:
      mapClubStatusToApplication(myMembership?.myStatus) ?? managedGroup.applicationStatus,
  };

  const bookshelfItems = bookshelfList.items.map(mapApiBookshelfToItem);
  const noticeItems = sortNoticeItems([
    ...noticeList.pinnedNotices.map(mapNoticePreviewToNoticeItem),
    ...noticeList.normalNotices.map(mapNoticePreviewToNoticeItem),
  ]);

  const editDraftPatch = toEditDraft(managedGroup);

  let joinRequests: WorkspaceSnapshot['joinRequests'] = [];
  let members: WorkspaceSnapshot['members'] = [];

  if (canManageClub) {
    const [detail, pendingMembers, activeMembers] = await Promise.all([
      fetchClubDetail(clubId),
      fetchClubMembers(clubId, 'PENDING'),
      fetchClubMembers(clubId, 'ACTIVE'),
    ]);

    if (detail) {
      const refinedGroup = mapManagedClubDetailToGroup(detail, prevGroup);
      managedGroup = {
        ...refinedGroup,
        notice: latestNotice?.title,
        applicationStatus:
          mapClubStatusToApplication(myMembership?.myStatus) ?? refinedGroup.applicationStatus,
      };
    }

    joinRequests = pendingMembers.items.map(mapClubManagedMemberToJoinRequest);
    members = activeMembers.items.map(mapClubManagedMemberToGroupMember);
  }

  return {
    managedGroup,
    canManageClub,
    latestNoticeId,
    bookshelfItems,
    noticeItems,
    editDraftPatch,
    joinRequests,
    members,
  };
}
