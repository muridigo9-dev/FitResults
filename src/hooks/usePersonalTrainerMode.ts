import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyGroups } from "@/hooks/useUserGroups";
import { useMyCreatorPermissions } from "@/hooks/useContentCreators";

/**
 * Main hook for Personal Trainer Mode
 * Provides all necessary state and permissions for the feature
 */
export function usePersonalTrainerMode() {
  const { isEnabled, isLoading: isFlagsLoading } = useFeatureFlags();
  const { isAdmin, isContentCreator, isLoading: isRoleLoading } = useUserRole();
  const { myGroups, isLoading: isGroupsLoading } = useMyGroups();
  const { permissions: creatorPermissions, isLoading: isPermLoading } = useMyCreatorPermissions();

  // Check if personal trainer mode is enabled
  const isPersonalTrainerModeEnabled = isEnabled("personal_trainer_mode_enabled");

  // Can this user manage content?
  const canManageContent = isAdmin || isContentCreator;

  // Can this user create specific content types?
  const canCreateDiets = isAdmin || (isContentCreator && (creatorPermissions?.can_create_diets ?? false));
  const canCreateWorkouts = isAdmin || (isContentCreator && (creatorPermissions?.can_create_workouts ?? false));
  const canCreateChallenges = isAdmin || (isContentCreator && (creatorPermissions?.can_create_challenges ?? false));
  const canCreateHabits = isAdmin || (isContentCreator && (creatorPermissions?.can_create_habits ?? false));

  // Can this user manage groups?
  const canManageGroups = isAdmin || isContentCreator;

  // Groups the user belongs to (for content visibility)
  const userGroupIds = myGroups?.map((m: any) => m.group_id) || [];

  // Groups the content creator is allowed to manage
  const allowedGroupIds = isAdmin 
    ? null // Admin can manage all groups
    : creatorPermissions?.allowed_group_ids || [];

  const isLoading = isFlagsLoading || isRoleLoading || isGroupsLoading || isPermLoading;

  return {
    // Feature status
    isPersonalTrainerModeEnabled,
    isLoading,

    // Role checks
    isAdmin,
    isContentCreator,
    canManageContent,
    canManageGroups,

    // Content creation permissions
    canCreateDiets,
    canCreateWorkouts,
    canCreateChallenges,
    canCreateHabits,

    // Group data
    userGroupIds,
    allowedGroupIds,
    creatorPermissions,
  };
}
