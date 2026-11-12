import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "../../api/axios";
import { useAuth } from "../../context/useAuth";
import type {
  DashboardResponse,
  DashboardSummary,
  RequestPriority,
  RequestStatus,
} from "../../types/dashboard";

const statusItems: {
  key: RequestStatus;
  label: string;
  icon: typeof FileText;
}[] = [
  { key: "DRAFT", label: "Draft", icon: FileText },
  { key: "SUBMITTED", label: "Submitted", icon: Activity },
  { key: "UNDER_REVIEW", label: "Under review", icon: Clock },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejected", icon: XCircle },
  { key: "IN_PROGRESS", label: "In progress", icon: RefreshCw },
  { key: "COMPLETED", label: "Completed", icon: ShieldCheck },
];

const priorityItems: {
  key: RequestPriority;
  label: string;
}[] = [
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
  { key: "CRITICAL", label: "Critical" },
];

const statusStyles: Record<RequestStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-teal-100 text-teal-700",
};

const priorityStyles: Record<RequestPriority, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-red-500",
};



function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await api.get<DashboardResponse>(
        "/dashboard/summary"
      );

      setSummary(response.data.data);
    } catch {
      setError(
        "Unable to load dashboard statistics. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);



  const totalByStatus = summary
    ? Object.values(summary.statusCounts).reduce(
        (total, count) => total + count,
        0
      )
    : 0;

  const totalByPriority = summary
    ? Object.values(summary.priorityCounts).reduce(
        (total, count) => total + count,
        0
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      <main className="max-w-[1400px] mx-auto px-5 sm:px-8 py-9">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-teal-600 font-medium mb-2">
              <LayoutDashboard size={17} />
              Overview
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back, {user?.name}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Here's an overview of your request workflow.
            </p>
          </div>

          <button
            onClick={() => void loadDashboard()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={isLoading ? "animate-spin" : ""}
            />
            Refresh data
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle size={19} />
              {error}
            </div>
            <button
              onClick={() => void loadDashboard()}
              className="text-sm font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !summary ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin mx-auto text-teal-600" size={30} />
            <p className="text-slate-500 text-sm mt-4">
              Loading your dashboard...
            </p>
          </div>
        ) : summary ? (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Total requests</p>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-5">
                  {summary.totalRequests}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Visible within your access scope
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Completed</p>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-5">
                  {summary.statusCounts.COMPLETED}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Successfully completed requests
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">In progress</p>
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Activity className="text-violet-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-5">
                  {summary.statusCounts.IN_PROGRESS}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Currently being worked on
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">Overdue requests</p>
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="text-red-600" size={20} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900 mt-5">
                  {summary.overdueCount}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Past their due date
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-7">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Requests by status
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Workflow distribution
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {totalByStatus} requests
                  </span>
                </div>

                <div className="space-y-5">
                  {statusItems.map((item) => {
                    const count = summary.statusCounts[item.key];
                    const percentage = totalByStatus
                      ? (count / totalByStatus) * 100
                      : 0;
                    const Icon = item.icon;

                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className="text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Requests by priority
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Priority distribution
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {totalByPriority} requests
                  </span>
                </div>

                <div className="space-y-7">
                  {priorityItems.map((item) => {
                    const count = summary.priorityCounts[item.key];
                    const percentage = totalByPriority
                      ? (count / totalByPriority) * 100
                      : 0;

                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-600">
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {count}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${priorityStyles[item.key]} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Total priority records
                  </span>
                  <span className="font-semibold text-slate-800">
                    {totalByPriority}
                  </span>
                </div>
              </div>
            </section>

            <section className="mt-7 bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">
                    Workflow status overview
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Current request counts by status
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  Updated {formatDate(summary.generatedAt)}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                {statusItems.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl px-4 py-3 ${statusStyles[item.key]}`}
                  >
                    <p className="text-xs font-medium">
                      {item.label}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {summary.statusCounts[item.key]}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <footer className="mt-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-400">
          <span>Signed in as {user?.name} — {user?.role.replaceAll("_", " ")}</span>
          <span>Secure workflow workspace</span>
        </footer>
      </main>
    </div>
  );
}
