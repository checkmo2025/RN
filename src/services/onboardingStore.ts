import * as SecureStore from 'expo-secure-store';

const ONBOARDING_SEEN_KEY = 'checkmo.onboarding.v1.seen';
const CLUB_ONBOARDING_SEEN_KEY = 'checkmo.onboarding.club.v1.seen';
const ONBOARDING_SEEN_VALUE = 'true';

export async function getOnboardingSeen(): Promise<boolean> {
  return (await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY)) === ONBOARDING_SEEN_VALUE;
}

export async function setOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, ONBOARDING_SEEN_VALUE);
}

export async function resetOnboardingSeen(): Promise<void> {
  await SecureStore.deleteItemAsync(ONBOARDING_SEEN_KEY);
}

export async function getClubOnboardingSeen(): Promise<boolean> {
  return (await SecureStore.getItemAsync(CLUB_ONBOARDING_SEEN_KEY)) === ONBOARDING_SEEN_VALUE;
}

export async function setClubOnboardingSeen(): Promise<void> {
  await SecureStore.setItemAsync(CLUB_ONBOARDING_SEEN_KEY, ONBOARDING_SEEN_VALUE);
}

export async function resetClubOnboardingSeen(): Promise<void> {
  await SecureStore.deleteItemAsync(CLUB_ONBOARDING_SEEN_KEY);
}
