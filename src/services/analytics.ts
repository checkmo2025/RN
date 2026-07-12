import {
  getAnalytics,
  logCampaignDetails,
  logEvent,
  logJoinGroup,
  logLogin,
  logScreenView,
  logSignUp,
  setUserProperties,
} from '@react-native-firebase/analytics';

import {
  getStoredMarketingAttribution,
  type MarketingAttribution,
} from './marketingAttribution';

const MAX_SCREEN_NAME_LENGTH = 100;
const MAX_USER_PROPERTY_VALUE_LENGTH = 36;

function normalizeUserProperty(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, MAX_USER_PROPERTY_VALUE_LENGTH) : null;
}

async function syncAttributionUserProperties(): Promise<void> {
  const { firstTouch, lastTouch } = await getStoredMarketingAttribution();

  await setUserProperties(getAnalytics(), {
    first_source: normalizeUserProperty(firstTouch?.source),
    first_medium: normalizeUserProperty(firstTouch?.medium),
    first_campaign: normalizeUserProperty(firstTouch?.campaign),
    last_source: normalizeUserProperty(lastTouch?.source),
    last_medium: normalizeUserProperty(lastTouch?.medium),
    last_campaign: normalizeUserProperty(lastTouch?.campaign),
  });
}

export async function trackScreenView(screenName: string): Promise<void> {
  const normalizedName = screenName.trim().slice(0, MAX_SCREEN_NAME_LENGTH);
  if (!normalizedName) return;

  await logScreenView(getAnalytics(), {
    screen_name: normalizedName,
    screen_class: normalizedName,
  });
}

export async function trackCampaignDetails(
  attribution: MarketingAttribution,
): Promise<boolean> {
  const { source, medium, campaign, term, content } = attribution;
  if (!source || !medium || !campaign) return false;

  await logCampaignDetails(getAnalytics(), {
    source,
    medium,
    campaign,
    ...(term ? { term } : {}),
    ...(content ? { content } : {}),
  });
  await syncAttributionUserProperties();

  return true;
}

export async function trackLogin(method: string): Promise<void> {
  await syncAttributionUserProperties();
  await logLogin(getAnalytics(), { method });
}

export async function trackSignUp(method: string): Promise<void> {
  await syncAttributionUserProperties();
  await logSignUp(getAnalytics(), { method });
}

export async function trackClubJoinRequest(clubId: number): Promise<void> {
  await syncAttributionUserProperties();
  await logEvent(getAnalytics(), 'club_join_request', {
    club_id: String(clubId),
  });
}

export async function trackClubJoined(clubId: number): Promise<void> {
  await syncAttributionUserProperties();
  await logJoinGroup(getAnalytics(), { group_id: String(clubId) });
}
