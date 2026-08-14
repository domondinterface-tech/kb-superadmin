"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { Field, inputClass, SubmitButton } from "@/components/ui";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Imèl">
        <input name="email" type="email" required className={inputClass} autoComplete="email" />
      </Field>
      <Field label="Modpas">
        <input name="password" type="password" required className={inputClass} autoComplete="current-password" />
      </Field>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton pending={isPending}>{isPending ? "Ap konekte..." : "Konekte"}</SubmitButton>
    </form>
  );
}
