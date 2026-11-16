import SectionErrorBoundary from '../../_components/SectionErrorBoundary';
import SectionHeader from '../../_components/SectionHeader';
import SettingsHole from '../../_components/SettingsHole';
import ProfileSection from './ProfileSection';
import ProfileSkeleton from './ProfileSkeleton';

/** The section's skeleton: its hole's fallback and its failure's space */
const profileSkeleton = <ProfileSkeleton />;

/**
 * Profile: the form and how visitors see you. Its own
 * route, and `/settings` from lg (beside the sidebar). The viewer's data
 * streams into its own hole, so nothing around it waits for it.
 */
export default function ProfilePage() {
  return (
    <section
      className="flex flex-col gap-6"
      data-testid="route-settings-profile"
    >
      <SectionHeader lede="How you appear on tvseri.es." title="Profile" />
      <SectionErrorBoundary placeholder={profileSkeleton} what="Your profile">
        <SettingsHole fallback={profileSkeleton} name="settings-profile">
          <ProfileSection />
        </SettingsHole>
      </SectionErrorBoundary>
    </section>
  );
}
