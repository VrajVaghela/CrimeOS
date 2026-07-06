"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";

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
    <main className="grid min-h-screen place-items-center bg-background p-6 grid-bg">
      <section className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground glow-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold">Crime OS AI</h1>
            <p className="text-sm text-muted-foreground">Officer access / अधिकारी प्रवेश</p>
          </div>
        </div>
        <Card className="glass">
          <CardHeader>
            <div>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Secure casework session</CardDescription>
            </div>
            <Lock className="h-5 w-5 text-primary" />
          </CardHeader>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm">{error}</p> : null}
            <Button type="submit" disabled={submitting}>
              <Lock className="h-4 w-4" />
              {submitting ? "Signing in..." : "Enter dashboard"}
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
