import LaunchGate from "@/components/LaunchGate";
import { countUsers } from "@/db/queries";

const LAUNCH_AT_PLAYERS = 15;

export default async function DefensePage() {
  const current = await countUsers();
  return (
    <LaunchGate
      titleKey="nav.defense"
      current={current}
      target={LAUNCH_AT_PLAYERS}
      bg="/bg/defense.png"
    />
  );
}
