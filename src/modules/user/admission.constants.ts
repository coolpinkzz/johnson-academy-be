export const GENDERS = ['male', 'female', 'other'] as const;

export type Gender = (typeof GENDERS)[number];

export const REFERRAL_SOURCES = [
  'friend_or_family',
  'social_media',
  'google',
  'website',
  'walk_in',
  'advertisement',
  'existing_student',
  'other',
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number];
