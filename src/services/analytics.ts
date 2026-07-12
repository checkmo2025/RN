import {
  getAnalytics,
  logCampaignDetails,
  logScreenView,
} from '@react-native-firebase/analytics';

import type { MarketingAttribution } from './marketingAttribution';

const MAX_SCREEN_NAME_LENGTH = 100;

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

  return true;
}
