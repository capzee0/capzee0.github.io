import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Sparkles,
  BarChart2,
  MonitorSmartphone,
  CreditCard,
  LifeBuoy,
  HelpCircle,
  LogOut,
  X,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";

type ProfileSection = "plan" | "usage" | "devices" | "payments" | "support" | "help";

const profileNavItems: { id: ProfileSection; label: string; icon: React.ElementType }[] = [
  { id: "plan", label: "Manage plan", icon: Zap },
  { id: "usage", label: "Usage", icon: BarChart2 },
  { id: "devices", label: "Devices / Sessions", icon: MonitorSmartphone },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "support", label: "Support", icon: LifeBuoy },
  { id: "help", label: "Help", icon: HelpCircle },
];

const planOptions = [
  { id: "feel-it", name: "Feel It", tag: null, wide: false },
  { id: "week-pass", name: "Week Pass", tag: null, wide: false },
  { id: "editor", name: "Editor", tag: null, wide: false },
  { id: "editor-pro", name: "Editor Pro", tag: "Popular", wide: false },
  { id: "editor-max", name: "Editor MAX", tag: "Best Value", wide: true },
];

function PlanContent() {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Current Plan Summary (Compact) */}
      <div className="flex items-center justify-between rounded-xl bg-black/15 border border-white/20 px-3.5 py-2 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-white text-[#D96846] flex items-center justify-center flex-shrink-0 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
          </div>
          <div>
            <p className="text-[9px] font-black tracking-wider uppercase text-white/70 leading-none">Current Plan</p>
            <p className="text-[14px] font-black text-white leading-tight mt-0.5">Free</p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-full shadow-2xs">
          Active
        </span>
      </div>

      {/* Plan Options (Compact Grid) */}
      <div className="grid grid-cols-2 gap-1.5">
        {planOptions.map((plan) => (
          <button
            key={plan.id}
            className={cn(
              "relative flex flex-col justify-center px-3 py-2 rounded-lg border border-white/20 bg-white/15 hover:bg-white/25 hover:border-white/40 transition-all text-left group backdrop-blur-xs shadow-xs",
              plan.wide && "col-span-2"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[12px] font-bold text-white leading-tight">{plan.name}</span>
              {plan.tag && (
                <span className="text-[8px] font-black text-white bg-[#16A34A] px-1.5 py-0.5 rounded-full border border-white/30 shadow-xs">
                  {plan.tag}
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/85 font-semibold mt-0.5 flex items-center gap-0.5 group-hover:underline">
              View on pricing <ArrowUpRight className="w-2.5 h-2.5 text-white" />
            </span>
          </button>
        ))}
      </div>

      {/* Upgrade Action */}
      <button className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.99] text-white font-black text-[13px] tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5 border border-white/20">
        <Zap className="w-3.5 h-3.5 fill-white" />
        Upgrade Plan
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>

      <p className="text-[9.5px] text-white/70 text-center leading-normal font-medium">
        Upgrading replaces your current plan immediately. Cancel anytime.
      </p>
    </div>
  );
}

function ComingSoonContent({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur-xs">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <p className="text-[14px] font-black text-white">{label}</p>
      <p className="text-[12px] text-white/80 font-medium">This section is coming soon.</p>
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("plan");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    if (profileOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [profileOpen]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  const { user, signOut, openAuthModal } = useAuthStore();
  const userEmail = user?.email || "User";
  const userInitial = (user?.email ? user.email[0] : "U").toUpperCase();
  const userName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#D96846] font-sans select-none text-[#2F3020]">
      {/* Top Navbar — Terracotta Orange */}
      <header className="h-13 sm:h-14 flex-shrink-0 bg-[#D96846] border-b border-[#2F3020]/20 px-4 sm:px-6 flex items-center justify-between z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center group" title="Capzee Dashboard">
            <img
              src="/capzee-wordmark.png"
              alt="Capzee"
              className="h-8 sm:h-8.5 w-auto object-contain transition-transform duration-200 group-hover:scale-105 drop-shadow-xs"
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-[#2F3020] bg-[#CDCBD6] px-2.5 py-1 rounded-md border border-[#2F3020]/20 shadow-2xs"
            title="Capzee Cloud AI Engine Active"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>AI Ready</span>
          </div>

          {/* Full User Profile Card Component */}
          {user ? (
            <button
              type="button"
              onClick={() => {
                setProfileOpen(true);
                setActiveSection("plan");
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-[#C85A3A] hover:bg-[#B84E30] border border-white/30 rounded-xl cursor-pointer shadow-xs hover:shadow-md transition-all group select-none text-left"
              aria-label="Open profile settings"
              id="user-profile-menu-btn"
              title="Click to view Account & Plan Settings"
            >
              {/* Avatar Circle with Gradient Ring */}
              <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-white/60 to-white/20 flex-shrink-0 shadow-xs">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#D96846] text-white flex items-center justify-center text-xs font-black shadow-inner border border-white/20">
                    {userInitial}
                  </div>
                )}
              </div>

              {/* User Name & Email */}
              <div className="min-w-0 max-w-[130px] sm:max-w-[180px] md:max-w-[220px]">
                <p className="text-[12px] font-black text-white leading-tight truncate group-hover:text-amber-100 transition-colors">
                  {userName}
                </p>
                <p className="text-[9.5px] text-white/80 truncate mt-0.5 font-medium leading-tight">
                  {userEmail}
                </p>
              </div>

              {/* Free Plan Badge */}
              <span className="text-[8.5px] font-extrabold text-white bg-black/20 border border-white/30 px-2 py-0.5 rounded-full flex-shrink-0 shadow-2xs">
                Free
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-[#2F3020] font-bold text-xs border border-white/40 shadow-xs hover:bg-[#FAF7F5] transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Body — full width, no sidebar, unified #D96846 theme */}
      <main className="flex-1 overflow-hidden bg-[#D96846] flex flex-col min-h-0">
        <Outlet />
      </main>

      {/* Profile Modal — backdrop blur + centered */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            backgroundColor: "rgba(47,48,32,0.55)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setProfileOpen(false);
          }}
        >
          <div
            className="relative bg-[#D96846] rounded-2xl shadow-2xl border-2 border-[#2F3020]/25 flex overflow-hidden"
            style={{ width: 610, maxHeight: "85vh" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Left panel */}
            <div className="w-52 flex-shrink-0 bg-[#C85A3A] border-r border-[#2F3020]/20 flex flex-col">
              {/* User header */}
              <div className="px-3.5 pt-4 pb-3.5 border-b border-[#2F3020]/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-white/60 to-white/20 flex-shrink-0 shadow-xs">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={userName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#D96846] flex items-center justify-center font-black text-xs text-white shadow-inner">
                        {userInitial}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black text-white leading-tight truncate">
                      {userName}
                    </p>
                    <p className="text-[9.5px] text-white/80 truncate mt-0.5 font-medium">{userEmail}</p>
                  </div>
                  <span className="text-[8.5px] font-extrabold text-white bg-black/20 border border-white/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Free
                  </span>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-2 py-2.5 space-y-0.5 overflow-y-auto">
                {profileNavItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all text-left",
                      activeSection === id
                        ? "bg-[#2F3020] text-white shadow-sm font-bold"
                        : "text-white/85 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>

              {/* Bottom */}
              <div className="px-2 pb-2.5 space-y-0.5 border-t border-[#2F3020]/20 pt-2">
                <Link
                  to="/dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-white/85 hover:bg-white/15 hover:text-white transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />
                  Projects
                </Link>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    signOut();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-red-200 hover:bg-red-500/20 hover:text-white transition-all text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  Log out
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#D96846]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#2F3020]/20 bg-[#C85A3A]/40">
                <h2 className="text-[13px] font-black text-white tracking-wide">
                  {profileNavItems.find((n) => n.id === activeSection)?.label ?? "Account"}
                </h2>
                <button
                  onClick={() => setProfileOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/25 text-white/90 hover:text-white transition-colors"
                  aria-label="Close profile"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3.5">
                {activeSection === "plan"     && <PlanContent />}
                {activeSection === "usage"    && <ComingSoonContent label="Usage" />}
                {activeSection === "devices"  && <ComingSoonContent label="Devices / Sessions" />}
                {activeSection === "payments" && <ComingSoonContent label="Payments" />}
                {activeSection === "support"  && <ComingSoonContent label="Support" />}
                {activeSection === "help"     && <ComingSoonContent label="Help" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




