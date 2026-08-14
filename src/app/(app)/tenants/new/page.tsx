import { Card, PageHeader } from "@/components/ui";
import { TenantForm } from "./tenant-form";

export default function NewTenantPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Nouvo Tenant" description="Kreye yon nouvo enstans KB Books pou yon biznis ekstèn." />
      <Card>
        <TenantForm />
      </Card>
    </div>
  );
}
