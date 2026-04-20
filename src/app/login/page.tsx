"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import Image from "next/image";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { useState } from "react";

const initialState = { error: null as string | null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[400px]">
        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header accent */}
          <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

          <div className="p-8">
            {/* Logo + Brand */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted border border-border overflow-hidden">
                <Image
                  src="/Logo DB.png"
                  alt="DB Consulting"
                  width={48}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  DB Consulting
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Sistema de Facturación
                </p>
              </div>
            </div>

            {/* Form */}
            <form action={formAction} className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-foreground"
                >
                  Usuario
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  autoFocus
                  disabled={isPending}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors"
                  placeholder="admin"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={isPending}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {state.error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive"
                >
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-destructive" />
                  {state.error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Ingresar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          DB Consulting · San Pedro Sula, Honduras
        </p>
      </div>
    </div>
  );
}
