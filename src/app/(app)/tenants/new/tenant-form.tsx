"use client";

import { useActionState } from "react";
import { createTenant, type CreateTenantState } from "@/lib/actions/tenants";
import { Field, inputClass, SubmitButton } from "@/components/ui";

const initialState: CreateTenantState = { error: null };

export function TenantForm() {
  const [state, formAction, isPending] = useActionState(createTenant, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <Field label="Non Tenant la">
        <input name="name" type="text" required className={inputClass} placeholder="Egzanp: Boutik Rosemond" autoComplete="off" />
      </Field>
      <Field label="Non Mak (Brand)">
        <input name="brandName" type="text" required className={inputClass} placeholder="Egzanp: Rosemond Books" autoComplete="off" />
        <span className="mt-1 block text-xs text-slate-400">Sa ki ap parèt kòm non app la pou tenant sa a (BRAND_NAME).</span>
      </Field>
      <Field label="Imèl Premye Admin">
        <input name="adminEmail" type="email" required className={inputClass} autoComplete="off" />
      </Field>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <SubmitButton pending={isPending}>{isPending ? "K ap kreye..." : "Kreye Tenant"}</SubmitButton>
    </form>
  );
}
