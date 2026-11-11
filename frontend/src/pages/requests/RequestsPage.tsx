import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRequests } from "../../services/requestService";
import type {
  RequestFilters,
  RequestPriority,
  RequestStatus,
  WorkflowRequest,
} from "../../types/request";

const statuses: RequestStatus[] = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED",
  "REJECTED", "IN_PROGRESS", "COMPLETED",
];

const priorities: RequestPriority[] = [
  "LOW", "MEDIUM", "HIGH", "CRITICAL",
];

const categories = ["FEATURE", "BUG", "CHANGE_REQUEST", "OTHER"];

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
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "�";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function RequestsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    (location.state as { successMessage?: string } | null)?.successMessage ?? ""
  );

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const filters: RequestFilters = {
        page,
        limit: 10,
        ...(status ? { status: status as RequestStatus } : {}),
        ...(priority ? { priority: priority as RequestPriority } : {}),
        ...(category ? { category } : {}),
      };

      const result = await getRequests(filters);

      setRequests(result.requests);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch {
      setError("Unable to load requests. Please try again.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, status, priority, category]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (successMessage) {
      const timeout = window.setTimeout(() => {
        setSuccessMessage("");
      }, 5000);

      navigate(location.pathname, { replace: true, state: null });

      return () => window.clearTimeout(timeout);
    }
  }, [successMessage, location.pathname, navigate]);

  const resetFilters = () => {
    setStatus("");
    setPriority("");
    setCategory("");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-9">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-teal-600 font-medium mb-2">
              <FileText size={17} />
              Workspace
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Requests</h1>
            <p className="text-sm text-slate-500 mt-2">
              View and manage requests within your access scope.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user?.role === "CLIENT_USER" && (
              <Link
                to="/requests/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition"
              >
                <Plus size={17} />
                Create Request
              </Link>
            )}

            <button
              onClick={() => void loadRequests()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} />
            {successMessage}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                STATUS
              </label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">All priorities</option>
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-2">
                CATEGORY
              </label>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={resetFilters}
              className="px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-xl transition"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-900">All requests</h2>
              <p className="text-xs text-slate-500 mt-1">
                {total} request{total === 1 ? "" : "s"} found
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Search size={19} className="text-teal-600" />
            </div>
          </div>

          {error && (
            <div className="m-5 p-4 rounded-xl bg-red-50 text-red-700 flex items-center gap-2 text-sm">
              <AlertCircle size={18} />
              {error}
              <button
                onClick={() => void loadRequests()}
                className="ml-auto underline font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["REQUEST", "CATEGORY", "PRIORITY", "STATUS", "DUE DATE", "CREATED"].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-[11px] font-semibold tracking-wider text-slate-500 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <RefreshCw className="animate-spin mx-auto text-teal-600" size={25} />
                      <p className="text-sm text-slate-500 mt-3">
                        Loading requests...
                      </p>
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                        <FileText className="text-slate-400" size={22} />
                      </div>
                      <p className="font-semibold text-slate-700 mt-4">
                        No requests found
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Requests matching your filters will appear here.
                      </p>
                      {user?.role === "CLIENT_USER" && (
                        <Link
                          to="/requests/new"
                          className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900"
                        >
                          <Plus size={16} />
                          Create your first request
                        </Link>
                      )}
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} onClick={() => navigate(`/requests/${request.id}`)} className="hover:bg-slate-50/70 transition cursor-pointer">
                      <td className="px-6 py-4 min-w-[230px]">
                        <p className="font-semibold text-sm text-slate-800">
                          {request.title}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          #{request.id.slice(0, 8)}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatLabel(request.category)}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[request.priority]}`}>
                          {request.priority}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${statusStyles[request.status]}`}>
                          {formatLabel(request.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(request.dueDate)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(request.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Showing {requests.length ? (page - 1) * 10 + 1 : 0}
              {" "}to{" "}
              {(page - 1) * 10 + requests.length} of {total} requests
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => current - 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-sm text-slate-600">
                Page {page} of {Math.max(totalPages, 1)}
              </span>

              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => current + 1)}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
