import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Eye, EyeOff, Workflow, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");

    try {
      await login(values);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setServerError(
          error.response?.data?.message ||
          "Unable to sign in. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl min-h-[620px] grid md:grid-cols-2 bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden">

        <section className="hidden md:flex flex-col justify-between bg-[#14243a] text-white p-12 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full border border-white/10" />
          <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full border border-white/10" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-400 flex items-center justify-center">
              <Workflow className="text-[#14243a]" size={25} />
            </div>
            <span className="font-semibold text-lg tracking-wide">
              Workflow Workspace
            </span>
          </div>

          <div className="relative z-10 max-w-sm">
            <div className="w-12 h-1 bg-teal-400 rounded-full mb-7" />
            <h1 className="text-4xl font-semibold leading-tight">
              Bring every request into one clear workflow.
            </h1>
            <p className="mt-6 text-slate-300 leading-7">
              Manage client requests, coordinate teams, and move approvals
              forward with confidence.
            </p>

            <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck className="text-teal-400" size={20} />
              Secure access to your workspace
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-400">
            Secure request and approval management
          </p>
        </section>

        <section className="flex flex-col justify-center px-7 py-12 sm:px-12 lg:px-16">
          <div className="md:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Workflow className="text-white" size={23} />
            </div>
            <span className="font-semibold text-slate-800">
              Workflow Workspace
            </span>
          </div>

          <div className="max-w-sm w-full mx-auto">
            <p className="text-sm font-semibold text-teal-600 mb-3">
              WORKSPACE ACCESS
            </p>
            <h2 className="text-3xl font-bold text-slate-900">
              Welcome back
            </h2>
            <p className="text-slate-500 mt-3 text-sm leading-6">
              Sign in with your organization account to continue.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-9 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register("email")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...register("password")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pr-12 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600"
                >
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16a99a] hover:bg-[#108f83] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 transition shadow-lg shadow-teal-600/15"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-9 leading-5">
              Access is provided by your organization administrator.
              <br />
              Contact your administrator if you need an account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
