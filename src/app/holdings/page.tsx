import { HoldingsListClient } from "@/components/holdings/HoldingsListClient";
import { getHoldingsData } from "@/lib/data-source";

export default async function HoldingsListPage() {
  const { members, currentHoldings: allCurrent, clearedHoldings: allCleared } = await getHoldingsData();

  const memberGroups = members.map((m) => ({
    id: m.id,
    name: m.name,
    holdings: allCurrent.filter((h) => h.memberId === m.id),
  }));

  const clearedByMember: Record<string, typeof allCleared> = {};
  for (const h of allCleared) {
    if (!clearedByMember[h.memberId]) clearedByMember[h.memberId] = [];
    clearedByMember[h.memberId].push(h);
  }

  return (
    <div className="animate-in">
      <HoldingsListClient members={memberGroups} clearedByMember={clearedByMember} />
    </div>
  );
}
