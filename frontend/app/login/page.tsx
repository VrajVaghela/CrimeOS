"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, register } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("IO");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (isRegisterMode) {
      // Registration flow
      try {
        if (!fullName.trim()) {
          setError("Full name is required");
          setSubmitting(false);
          return;
        }
        await register(username, password, fullName, role);
        setSuccess("Account created! Signing you in…");
        // Auto sign-in after registration
        await signIn(username, password);
        router.push("/dashboard");
      } catch (caught: unknown) {
        setError(caught instanceof ApiError ? caught.message : "Registration failed");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Login flow
      try {
        await signIn(username, password);
        router.push("/dashboard");
      } catch (caught: unknown) {
        setError(caught instanceof ApiError ? caught.message : t("login.error_generic"));
      } finally {
        setSubmitting(false);
      }
    }
  }

  function toggleMode() {
    setIsRegisterMode(!isRegisterMode);
    setError(null);
    setSuccess(null);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4 sm:p-6 lg:p-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-squircle border border-border bg-card lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <div className="hidden flex-col justify-between border-r border-border bg-sidebar p-8 lg:flex xl:p-10">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-squircle-sm border border-border bg-surface-alt text-info">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold tracking-wide text-foreground">CRIME OS <span className="text-accent-strong">AI</span></p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("login.workspace_heading")}</p>
              </div>
            </div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-info">{t("login.feature_evidence")}</p>
            <h1 className="max-w-md font-heading text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground xl:text-4xl">
              {t("login.workspace_sub")}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
              {t("login.workspace_body")}
            </p>
          </div>
          <div className="space-y-3 border-t border-border pt-5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success" /> {t("login.feature_secure_sub")}</p>
            <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-info" /> {t("login.feature_evidence_sub")}</p>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-squircle-sm border border-border bg-surface-alt text-info">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold tracking-wide text-foreground">CRIME OS <span className="text-accent-strong">AI</span></p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t("login.feature_secure")}</p>
            </div>
          </div>

          <Card className="border-0 bg-transparent p-0">
            <CardHeader className="mb-7 p-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="font-heading text-2xl">
                    {isRegisterMode ? "Create Account" : t("login.submit")}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isRegisterMode ? "Register a new officer account" : t("login.open_workspace")}
                  </CardDescription>
                </div>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-squircle-sm border border-border bg-surface-alt text-muted-foreground">
                  {isRegisterMode ? <UserPlus className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">{t("login.username_label")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("login.password_label")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("login.password_placeholder")}
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
              />
            </div>

            {isRegisterMode && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="e.g. Inspector Asha Patel"
                    autoComplete="name"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="flex h-10 w-full rounded-squircle-sm border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-[border-color,box-shadow] duration-[var(--motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="IO">Investigating Officer (IO)</option>
                    <option value="SHO">Station House Officer (SHO)</option>
                    <option value="LEGAL">Legal Advisor</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="animate-scale-in flex items-center gap-2 rounded-squircle-sm border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {error}
              </div>
            )}

            {success && (
              <div className="animate-scale-in flex items-center gap-2 rounded-squircle-sm border border-success/40 bg-success/10 px-3 py-2.5 text-sm text-success">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              loading={submitting}
              size="lg"
              className="mt-1 w-full"
            >
              {isRegisterMode ? <UserPlus className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              {submitting
                ? (isRegisterMode ? "Creating account…" : t("login.authenticating"))
                : (isRegisterMode ? "Create Account & Sign In" : t("login.enter_dashboard"))
              }
              {!submitting && <ArrowRight className="ml-auto h-4 w-4 opacity-70" />}
            </Button>

            <button
              type="button"
              onClick={toggleMode}
              className="text-center text-sm text-muted-foreground transition-colors duration-[var(--motion-fast)] hover:text-foreground"
            >
              {isRegisterMode
                ? "Already have an account? Sign in"
                : "Don't have an account? Create one"
              }
            </button>

            <p className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("login.demo_footer")}
            </p>
          </form>
          </Card>
        </div>
      </section>
    </main>
  );
}
