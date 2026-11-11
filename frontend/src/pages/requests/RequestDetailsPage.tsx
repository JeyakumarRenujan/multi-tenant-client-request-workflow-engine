import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Send,
  Play,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import {
  getRequestById,
  transitionRequest,
  getRequestAssignees,
  assignRequest,
  getRequestActivity,
} from "../../services/requestService";
import type {
  WorkflowRequest,
  RequestStatus,
  RequestAssignee,
  RequestActivity,
} from "../../types/request";

const statusStyles: Record<RequestStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-teal-100 text-teal-700",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


function describeActivity(event: string) {
  switch (event) {
    case "REQUEST_CREATED":
      return "Request created";
    case "REQUEST_UPDATED":
      return "Request details updated";
    case "REQUEST_ASSIGNED":
      return "Developer assigned";
    case "REQUEST_UNASSIGNED":
      return "Developer unassigned";
    case "REQUEST_STATUS_CHANGED":
      return "Request status changed";
    default:
      return formatLabel(event);
  }
}
export default function RequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [developers, setDevelopers] = useState<RequestAssignee[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [activities, setActivities] = useState<RequestActivity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState("");

  const loadRequest = useCallback(async () => {
    if (!id) {
      setError("Invalid request ID.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await getRequestById(id);
      setRequest(result);
      setSelectedAssigneeId(result.assignedToId ?? "");
    } catch {
      setError("Unable to load this request. It may not exist or you may not have access.");
      setRequest(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadRequest();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadRequest]);
  const loadActivity = useCallback(async () => {
    if (!id) return;

    setIsLoadingActivity(true);
    setActivityError("");

    try {
      const result = await getRequestActivity(id);
      setActivities(result);
    } catch {
      setActivityError("Unable to load request activity. Please try again.");
      setActivities([]);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadActivity();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadActivity]);

  useEffect(() => {
    if (user?.role !== "MANAGER") return;

    let isActive = true;

    async function loadDevelopers() {
      setIsLoadingAssignees(true);

      try {
        const result = await getRequestAssignees();

        if (isActive) {
          setDevelopers(result);
        }
      } catch {
        if (isActive) {
          setError("Unable to load available Developers.");
        }
      } finally {
        if (isActive) {
          setIsLoadingAssignees(false);
        }
      }
    }

    void loadDevelopers();

    return () => {
      isActive = false;
    };
  }, [user?.role]);
  async function handleAssignment() {
    if (!request || !id) return;

    setIsAssigning(true);
    setError("");
    setSuccess("");

    try {
      const updated = await assignRequest(id, {
        version: request.version,
        assignedToId: selectedAssigneeId || null,
      });

      setRequest(updated);
      setSelectedAssigneeId(updated.assignedToId ?? "");
      setSuccess("Developer assignment updated successfully.");
      void loadActivity();
    } catch {
      setError("Unable to update the assignment. Please refresh and try again.");
    } finally {
      setIsAssigning(false);
    }
  }
  async function handleTransition(
    status:
      | "SUBMITTED"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "IN_PROGRESS"
      | "COMPLETED",
    reason?: string
  ) {
    if (!request || !id) return;

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      const updated = await transitionRequest(id, {
        version: request.version,
        status,
        ...(reason ? { rejectionReason: reason } : {}),
      });

      setRequest(updated);
      setShowRejectForm(false);
      setRejectionReason("");
      setSuccess(`Request status updated to ${formatLabel(status)}.`);
      void loadActivity();
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Unable to update the request. Please refresh and try again.";

      setError(message);
    } finally {
      setIsUpdating(false);
    }
  }

  const role = user?.role;

  const canSubmit =
    role === "CLIENT_USER" && request?.status === "DRAFT";

  const canReview =
    role === "MANAGER" && request?.status === "SUBMITTED";

  const canDecide =
    role === "MANAGER" && request?.status === "UNDER_REVIEW";

  const canStart =
    role === "DEVELOPER" && request?.status === "APPROVED";

  const canComplete =
    role === "DEVELOPER" && request?.status === "IN_PROGRESS";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="animate-spin text-teal-600" size={30} />
      </div>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="mx-auto text-red-500" size={32} />
          <h1 className="text-xl font-bold text-slate-900 mt-4">
            Request unavailable
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {error || "This request could not be found."}
          </p>
          <Link
            to="/requests"
            className="inline-flex items-center gap-2 mt-6 text-teal-700 font-semibold"
          >
            <ArrowLeft size={16} />
            Back to requests
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-9">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
          <div>
            <Link
              to="/requests"
              className="inline-flex items-center gap-2 text-sm text-teal-700 hover:text-teal-900 font-medium mb-4"
            >
              <ArrowLeft size={16} />
              Back to requests
            </Link>
            <p className="text-sm text-slate-500">Request details</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {request.title}
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Request ID: {request.id}
            </p>
          </div>

          <button
            onClick={() => void loadRequest()}
            disabled={isLoading || isUpdating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
            <button
              onClick={() => void loadRequest()}
              className="mt-2 underline font-semibold"
            >
              Reload request
            </button>
          </div>
        )}

        {success && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[request.status]}`}>
              {formatLabel(request.status)}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${priorityStyles[request.priority]}`}>
              {request.priority} PRIORITY
            </span>
            <span className="text-xs text-slate-500">
              {formatLabel(request.category)}
            </span>
          </div>

          <h2 className="font-bold text-slate-900 mb-3">Description</h2>
          <p className="text-sm text-slate-600 leading-7 whitespace-pre-wrap">
            {request.description}
          </p>

          {request.rejectionReason && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-800 text-sm">
                Rejection reason
              </h3>
              <p className="text-sm text-red-700 mt-2 whitespace-pre-wrap">
                {request.rejectionReason}
              </p>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-6">
          <h2 className="font-bold text-slate-900 mb-5">
            Request information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="text-blue-600" size={19} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Due date</p>
                <p className="text-sm font-medium text-slate-800 mt-1">
                  {formatDate(request.dueDate)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <User className="text-teal-600" size={19} />
              </div>
              <div>
                <p className="text-xs text-slate-400">Assigned developer</p>
                <p className="text-sm font-medium text-slate-800 mt-1">
                  {request.assignedToId
                    ? developers.find(
                        (developer) => developer.id === request.assignedToId
                      )?.name ?? `User ${request.assignedToId.slice(0, 8)}`
                    : "Not assigned"}
                </p>

                {user?.role === "MANAGER" && (
                  <div className="mt-3 space-y-2">
                    <select
                      value={selectedAssigneeId}
                      onChange={(event) =>
                        setSelectedAssigneeId(event.target.value)
                      }
                      disabled={isLoadingAssignees || isAssigning}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>

                      {selectedAssigneeId &&
                        !developers.some(
                          (developer) => developer.id === selectedAssigneeId
                        ) && (
                          <option value={selectedAssigneeId}>
                            Current assignment (not in active Developer list)
                          </option>
                        )}

                      {developers.map((developer) => (
                        <option key={developer.id} value={developer.id}>
                          {developer.name} ({developer.email})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void handleAssignment()}
                      disabled={
                        isLoadingAssignees ||
                        isAssigning ||
                        selectedAssigneeId === (request.assignedToId ?? "")
                      }
                      className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isLoadingAssignees
                        ? "Loading Developers..."
                        : isAssigning
                          ? "Saving..."
                          : "Save Assignment"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">Created</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {formatDate(request.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Last updated</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {formatDate(request.updatedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Request version</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                v{request.version}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Client ID</p>
              <p className="text-sm font-medium text-slate-800 mt-1">
                {request.clientId}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="font-bold text-slate-900">Activity timeline</h2>
              <p className="text-sm text-slate-500 mt-1">
                A chronological record of actions performed on this request.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadActivity()}
              disabled={isLoadingActivity}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={15} className={isLoadingActivity ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {isLoadingActivity && (
            <div className="flex items-center gap-3 py-6 text-sm text-slate-500">
              <RefreshCw size={17} className="animate-spin" />
              Loading activity history...
            </div>
          )}

          {!isLoadingActivity && activityError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{activityError}</p>
              <button
                type="button"
                onClick={() => void loadActivity()}
                className="mt-2 text-sm font-semibold text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoadingActivity && !activityError && activities.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <Clock size={25} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">
                No activity recorded yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Request actions will appear here as they happen.
              </p>
            </div>
          )}

          {!isLoadingActivity && !activityError && activities.length > 0 && (
            <div className="relative">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 pb-7 last:pb-0">
                  {index !== activities.length - 1 && (
                    <div className="absolute left-[15px] top-9 bottom-0 w-px bg-slate-200" />
                  )}

                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-teal-50">
                    <Clock size={15} className="text-teal-700" />
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {describeActivity(activity.event)}
                      </p>
                      <time
                        dateTime={activity.createdAt}
                        className="text-xs text-slate-400"
                      >
                        {formatDate(activity.createdAt)}
                      </time>
                    </div>

                    <p className="text-sm text-slate-600 mt-1">
                      {activity.actor?.name ?? "System"}
                    </p>

                    {activity.actor?.role && (
                      <span className="inline-block mt-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        {formatLabel(activity.actor.role)}
                      </span>
                    )}

                    {(activity.previousStatus || activity.newStatus) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {activity.previousStatus && (
                          <span className={`rounded-full px-2.5 py-1 font-medium ${statusStyles[activity.previousStatus]}`}>
                            {formatLabel(activity.previousStatus)}
                          </span>
                        )}

                        {activity.previousStatus && activity.newStatus && (
                          <span className="text-slate-400">→</span>
                        )}

                        {activity.newStatus && (
                          <span className={`rounded-full px-2.5 py-1 font-medium ${statusStyles[activity.newStatus]}`}>
                            {formatLabel(activity.newStatus)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        {(canSubmit || canReview || canDecide || canStart || canComplete) && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <h2 className="font-bold text-slate-900 mb-2">
              Workflow actions
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Available actions for your account and the current request status.
            </p>

            {canSubmit && (
              <button
                disabled={isUpdating}
                onClick={() => void handleTransition("SUBMITTED")}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Send size={17} />
                Submit request
              </button>
            )}

            {canReview && (
              <button
                disabled={isUpdating}
                onClick={() => void handleTransition("UNDER_REVIEW")}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <FileText size={17} />
                Start review
              </button>
            )}

            {canDecide && !showRejectForm && (
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={isUpdating}
                  onClick={() => void handleTransition("APPROVED")}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Check size={17} />
                  Approve request
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X size={17} />
                  Reject request
                </button>
              </div>
            )}

            {canDecide && showRejectForm && (
              <div className="space-y-3">
                <label htmlFor="rejectionReason" className="block text-sm font-semibold text-slate-700">
                  Rejection reason (required)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={4}
                  maxLength={2000}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-red-500"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={isUpdating || !rejectionReason.trim()}
                    onClick={() => void handleTransition("REJECTED", rejectionReason.trim())}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm rejection
                  </button>
                  <button
                    disabled={isUpdating}
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {canStart && (
              <button
                disabled={isUpdating}
                onClick={() => void handleTransition("IN_PROGRESS")}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                <Play size={17} />
                Start work
              </button>
            )}

            {canComplete && (
              <button
                disabled={isUpdating}
                onClick={() => void handleTransition("COMPLETED")}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                <CheckCircle2 size={17} />
                Mark as completed
              </button>
            )}

            {isUpdating && (
              <p className="text-sm text-slate-500 mt-4 flex items-center gap-2">
                <RefreshCw size={15} className="animate-spin" />
                Updating request...
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
