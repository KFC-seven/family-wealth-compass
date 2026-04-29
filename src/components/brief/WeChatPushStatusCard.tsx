import { Card, CardContent } from "@/components/ui/card";
import { WeChatPushStatus } from "@/types/brief";
import { CheckCircle2, XCircle, Bell, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeChatPushStatusCardProps {
  status: WeChatPushStatus;
}

const channelLabels: Record<string, string> = {
  wecom_robot: "企业微信群机器人", server_chan: "Server 酱",
  wechat: "微信通道", disabled: "未启用",
};

export function WeChatPushStatusCard({ status }: WeChatPushStatusCardProps) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">微信推送状态</p>
          </div>
          {status.pushed ? (
            <span className="flex items-center gap-1 text-xs text-positive">
              <CheckCircle2 className="w-3.5 h-3.5" /> 已推送
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="w-3.5 h-3.5" /> 未推送
            </span>
          )}
        </div>
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">推送渠道</span>
            <span>{channelLabels[status.channel]}</span>
          </div>
          {status.pushTime && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">推送时间</span>
              <span>{status.pushTime}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">推送结果</span>
            <span className={status.success ? "text-positive" : "text-negative"}>
              {status.success ? "成功" : status.failReason || "失败"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors" disabled>
            <Send className="w-3 h-3" /> 重新推送
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors" disabled>
            推送预览
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
