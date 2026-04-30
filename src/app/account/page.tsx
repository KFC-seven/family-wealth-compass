"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogOut, Key, Shield, Monitor } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => {
      setUser(j.ok ? j.data : null);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChanging(true);
    setMsg("");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    const json = await res.json();
    setMsg(json.ok ? "密码已修改" : (json.error?.message ?? "修改失败"));
    if (json.ok) { setOldPw(""); setNewPw(""); }
    setChanging(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user?.user && !user?.authenticated) {
    return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">认证未启用</p></div>;
  }

  return (
    <div className="space-y-6 animate-in max-w-2xl mx-auto">
      <PageHeader title="账户与安全" subtitle="管理账户信息和安全设置" />

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">{user?.user?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{user?.user?.email} · {user?.user?.role}</p>
            </div>
          </div>
          {user?.member && (
            <div className="text-sm text-muted-foreground">
              绑定成员: {user.member.name} {user.member.isAdmin ? "(管理员)" : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">修改密码</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" placeholder="旧密码" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm" required />
            <input type="password" placeholder="新密码（至少6位）" value={newPw} onChange={(e) => setNewPw(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm" required minLength={6} />
            {msg && <p className={`text-sm ${msg.includes("失败") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
            <button type="submit" disabled={changing}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}修改密码
            </button>
          </form>
        </CardContent>
      </Card>

      <button onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
        <LogOut className="w-4 h-4" /> 退出登录
      </button>
    </div>
  );
}
