"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, Fingerprint, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [username, setUsername] = useState("io");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username, password);
      router.push("/dashboard");
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-background p-4 overflow-hidden">
      {/* Animated ambient background — multi-color glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 dot-pattern opacity-60" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[140px] animate-breathe" />
        <div className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full bg-info/10 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-violet/10 blur-[110px]" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-rose/5 blur-[100px]" />
      </div>

      <section className="relative w-full max-w-md animate-fade-up">
        {/* Logo header */}
        <div className="mb-8 flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-primary via-info to-violet text-white shadow-[0_0_30px_-4px] shadow-primary/40 animate-breathe">
              <Shield className="h-8 w-8" />
            </div>
            {/* Multi-ring decoration */}
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary/30 via-info/30 to-violet/30 blur-sm" />
            <div className="absolute -inset-1 rounded-xl border border-primary/20" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-primary">
              Crime OS AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Officer access <span className="text-info mx-1">·</span>{" "}
              <span className="font-sans">अधिकारी प्रवेश</span>
            </p>
          </div>
        </div>

        <Card className="glass-strong relative border-primary/10">
          {/* Multi-color top accent line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-primary via-info to-violet" />

          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="font-heading text-xl">Sign in</CardTitle>
                <CardDescription>Secure casework session</CardDescription>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-primary/20 via-info/20 to-violet/20 p-2 border border-primary/20">
                <Lock className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>

          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your credentials"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-[11px] text-muted-foreground hover:text-info transition-colors"
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="animate-scale-in rounded-lg border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-rose shrink-0 animate-pulse" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              loading={submitting}
              size="lg"
              className="w-full mt-1 bg-gradient-to-r from-primary to-info hover:from-primary/90 hover:to-info/90 text-white"
            >
              <Fingerprint className="h-4 w-4" />
              {submitting ? "Authenticating..." : "Enter dashboard"}
              {!submitting && <ArrowRight className="h-4 w-4 ml-auto opacity-60" />}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground font-mono">
              Press <kbd className="rounded border border-border bg-surface-alt px-1.5 py-0.5 text-[10px] text-info">↵</kbd> to submit
            </p>
          </form>
        </Card>

        <p className="mt-6 text-[10px] text-center text-muted-foreground font-mono opacity-50">
          Crime OS AI v0.1 · Intelligence-Led Investigation Platform
        </p>
      </section>
    </main>
  );
}
