"use client";

import { HoldingListItem } from "@/components/member/HoldingListItem";
import { useSorted } from "@/components/financial/SortBar";
import type { Holding } from "@/types/finance";

interface Props {
  holdings: Holding[];
  memberId: string;
}

export function CurrentHoldingsClient({ holdings, memberId }: Props) {
  const { sorted, sortBar } = useSorted(holdings, "marketValue");

  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        暂无持仓
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {sortBar}
      </div>
      <div className="space-y-2">
        {sorted.map((h) => (
          <HoldingListItem key={h.id} holding={h} memberId={memberId} />
        ))}
      </div>
    </div>
  );
}
