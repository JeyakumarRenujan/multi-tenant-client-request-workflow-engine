import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Users,
  Workflow,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    {
      label: "Dashboard",
      to: "/dashboard",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      label: "Requests",
      to: "/requests",
      icon: FileText,
      visible: true,
    },
    {
      label: "Create Request",
      to: "/requests/new",
      icon: Plus,
      visible: user?.role === "CLIENT_USER",
    },
    {
      label: "User Management",
      to: "/users",
      icon: Users,
      visible: user?.role === "ORGANIZATION_ADMIN",
    },
  ];

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 min-h-[76px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center">
              <Workflow className="text-white" size={25} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">
                Workflow Workspace
              </h1>
              <p className="text-xs text-slate-400">
                Request management platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500">
                {user?.role.replaceAll("_", " ")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="border-t border-slate-100"
        >
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 flex items-center gap-2 overflow-x-auto">
            {navigation.filter((item) => item.visible).map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/requests"}
                  className={({ isActive }) => {
                    const isRequestDetails =
                      item.to === "/requests" &&
                      location.pathname.startsWith("/requests/") &&
                      location.pathname !== "/requests/new";

                    const active = isActive || isRequestDetails;

                    return `inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                      active
                        ? "border-teal-600 text-teal-700"
                        : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                    }`;
                  }}
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}
