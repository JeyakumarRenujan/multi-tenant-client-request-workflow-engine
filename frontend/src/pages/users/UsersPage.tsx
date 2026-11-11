import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X
} from "lucide-react";
import {
  createUser,
  getClients,
  getUsers,
  updateUser,
  updateUserStatus
} from "../../services/userService";
import type {
  Client,
  ManagedUser,
  ManagedUserRole
} from "../../types/user";

const roles: ManagedUserRole[] = [
  "MANAGER",
  "DEVELOPER",
  "CLIENT_USER"
];

const roleStyles: Record<ManagedUserRole, string> = {
  MANAGER: "bg-violet-100 text-violet-700",
  DEVELOPER: "bg-blue-100 text-blue-700",
  CLIENT_USER: "bg-teal-100 text-teal-700"
};

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  const response = (
    error as {
      response?: { data?: { message?: string } };
    }
  )?.response;

  return response?.data?.message ?? fallback;
}

interface UserFormProps {
  user: ManagedUser | null;
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}

function UserForm({ user, clients, onClose, onSaved }: UserFormProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<ManagedUserRole>(
    user?.role ?? "DEVELOPER"
  );
  const [clientId, setClientId] = useState(user?.clientId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (role === "CLIENT_USER" && !clientId) {
      setError("Please select a client for this Client User.");
      return;
    }

    if (!user && password.length < 12) {
      setError("Password must contain at least 12 characters.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    setIsSaving(true);

    try {
      if (user) {
        await updateUser(user.id, {
          name: trimmedName,
          email: trimmedEmail,
          role,
          clientId: role === "CLIENT_USER" ? clientId : null
        });
      } else {
        await createUser({
          name: trimmedName,
          email: trimmedEmail,
          password,
          role,
          clientId: role === "CLIENT_USER" ? clientId : null
        });
      }

      onSaved();
    } catch (saveError) {
      setError(
        getErrorMessage(saveError, "Unable to save user. Please try again.")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {user ? "Edit user" : "Create new user"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {user
                ? "Update the user's organization account."
                : "Add a new member to your organization."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>
            <input
              required
              maxLength={150}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter full name"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email address
            </label>
            <input
              required
              type="email"
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {!user && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Initial password
              </label>
              <input
                required
                type="password"
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 12 characters"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                The password must contain 12�128 characters.
              </p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              User role
            </label>
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as ManagedUserRole);
                setClientId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {formatRole(item)}
                </option>
              ))}
            </select>
          </div>

          {role === "CLIENT_USER" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Assigned client
              </label>
              <select
                required
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>

              {clients.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  No clients are available in your organization.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || (role === "CLIENT_USER" && clients.length === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {user ? "Save changes" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getUsers({
        page,
        limit: 10,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { isActive: statusFilter === "active" } : {})
      });

      setUsers(result.users);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (loadError) {
      setError(
        getErrorMessage(loadError, "Unable to load organization users.")
      );
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, statusFilter]);

  const loadClients = useCallback(async () => {
    try {
      const result = await getClients();
      setClients(result.clients);
    } catch {
      setClients([]);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadClients();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadClients]);

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => setSuccess(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, search]);

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  const handleSaved = async () => {
    setShowForm(false);
    setSelectedUser(null);
    setSuccess(selectedUser ? "User updated successfully." : "User created successfully.");
    await loadUsers();
  };

  const handleStatusChange = async (user: ManagedUser) => {
    const action = user.isActive ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    setUpdatingId(user.id);
    setError("");
    setSuccess("");

    try {
      await updateUserStatus(user.id, !user.isActive);
      setSuccess(
        `${user.name} has been ${user.isActive ? "deactivated" : "activated"} successfully.`
      );
      await loadUsers();
    } catch (statusError) {
      setError(
        getErrorMessage(statusError, "Unable to update user status.")
      );
    } finally {
      setUpdatingId("");
    }
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setShowForm(true);
  };

  const openEditForm = (user: ManagedUser) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <div className="mx-auto max-w-[1400px] px-5 py-9 sm:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-600">
              <ShieldCheck size={17} />
              Workspace
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              User Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage members and access within your organization.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadUsers()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <Plus size={17} />
              Add user
            </button>
          </div>
        </div>

        {success && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle size={18} />
            {error}
            <button
              onClick={() => void loadUsers()}
              className="ml-auto font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total users</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Users size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{total}</p>
            <p className="mt-1 text-xs text-slate-400">Organization members</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Active users</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UserCheck size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{activeCount}</p>
            <p className="mt-1 text-xs text-slate-400">On the current page</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Inactive users</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <UserX size={20} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{inactiveCount}</p>
            <p className="mt-1 text-xs text-slate-400">On the current page</p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                SEARCH USERS
              </label>
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or email"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                ROLE
              </label>
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">All roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold text-slate-500">
                ACCOUNT STATUS
              </label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("");
                setStatusFilter("");
                setPage(1);
              }}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="font-bold text-slate-900">Organization users</h2>
              <p className="mt-1 text-xs text-slate-500">
                {total} user{total === 1 ? "" : "s"} found
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <UserPlus size={19} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  {["USER", "ROLE", "CLIENT", "STATUS", "CREATED", "ACTIONS"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-6 py-4 text-[11px] font-semibold tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Loader2
                        size={26}
                        className="mx-auto animate-spin text-teal-600"
                      />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading organization users...
                      </p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Users size={22} />
                      </div>
                      <p className="mt-4 font-semibold text-slate-700">
                        No users found
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Try changing your filters or add a new organization user.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50/70">
                      <td className="min-w-[230px] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {user.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${roleStyles[user.role]}`}
                        >
                          {formatRole(user.role)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {user.role === "CLIENT_USER"
                          ? clients.find((client) => client.id === user.clientId)?.name ?? "Assigned client"
                          : "�"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditForm(user)}
                            title="Edit user"
                            aria-label={`Edit ${user.name}`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => void handleStatusChange(user)}
                            disabled={updatingId === user.id}
                            title={user.isActive ? "Deactivate user" : "Activate user"}
                            aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.name}`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {updatingId === user.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : user.isActive ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
            <p className="text-xs text-slate-500">
              Showing {filteredUsers.length ? (page - 1) * 10 + 1 : 0}
              {" "}to{" "}
              {(page - 1) * 10 + filteredUsers.length} of {total} users
            </p>

            <div className="flex items-center gap-3">
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => current - 1)}
                aria-label="Previous page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-sm text-slate-600">
                Page {page} of {Math.max(totalPages, 1)}
              </span>

              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => current + 1)}
                aria-label="Next page"
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <UserForm
          user={selectedUser}
          clients={clients}
          onClose={() => {
            setShowForm(false);
            setSelectedUser(null);
          }}
          onSaved={() => void handleSaved()}
        />
      )}
    </main>
  );
}
