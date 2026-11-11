import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createRequest } from "../../services/requestService";

const categories = [
  { value: "FEATURE", label: "Feature Request" },
  { value: "BUG", label: "Bug Report" },
  { value: "CHANGE_REQUEST", label: "Change Request" },
  { value: "OTHER", label: "Other" },
] as const;

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export default function CreateRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<
    "FEATURE" | "BUG" | "CHANGE_REQUEST" | "OTHER"
  >("FEATURE");
  const [priority, setPriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user?.role !== "CLIENT_USER") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Access restricted</h1>
          <p className="text-slate-500 mt-2">
            Only client users can create requests.
          </p>
          <Link to="/requests" className="inline-block mt-5 text-teal-700 font-semibold hover:underline">
            Back to requests
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !description.trim()) {
      setError("Please complete the title and description.");
      return;
    }

    if (title.trim().length > 200) {
      setError("Title cannot exceed 200 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        ...(dueDate
          ? { dueDate: new Date(dueDate).toISOString() }
          : {}),
      });

      navigate("/requests", {
        replace: true,
        state: { successMessage: "Request created successfully." },
      });
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
          : "Unable to create the request. Please try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <Link
            to="/requests"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-700"
          >
            <ArrowLeft size={16} />
            Back to requests
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-4">
            Create a request
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit a new request for your organization.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 space-y-6"
        >
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-2">
              Request title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a clear request title"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <p className="text-xs text-slate-400 text-right mt-1">
              {title.length}/200
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what you need and include relevant details..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none resize-y focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as typeof category)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-semibold text-slate-700 mb-2">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as typeof priority)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                {priorities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-semibold text-slate-700 mb-2">
              Due date <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full md:max-w-md rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              to="/requests"
              className="px-5 py-3 text-center text-sm font-semibold text-slate-600 rounded-xl border border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-teal-700 rounded-xl hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit request
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
