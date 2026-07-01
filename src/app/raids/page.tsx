import LaunchGate from "@/components/LaunchGate";
import { countUsers } from "@/db/queries";

const LAUNCH_AT_PLAYERS = 14;

export default async function RaidsPage() {
  const current = await countUsers();
  return (
    <LaunchGate
      titleKey="nav.raids"
      current={current}
      target={LAUNCH_AT_PLAYERS}
      bg="/bg/raids.png"
    />
  );
}
