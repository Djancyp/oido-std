import { fetchSkills } from '@/hooks/skills';
import { SkillsClient } from '@/components/studio/skills/SkillsClient';

export default async function SkillsPage() {
  const skills = await fetchSkills();
  return <SkillsClient initialSkills={skills} />;
}
