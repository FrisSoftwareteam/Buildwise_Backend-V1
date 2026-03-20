import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "NGN 0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
    case 'done':
    case 'active':
    case 'handover_complete':
      return 'bg-success/20 text-success border-success/30';
    case 'in_progress':
    case 'under_review':
    case 'negotiation':
    case 'handover_in_progress':
      return 'bg-primary/20 text-primary border-primary/30';
    case 'planning':
    case 'todo':
    case 'submitted':
    case 'pending':
      return 'bg-warning/20 text-warning border-warning/30';
    case 'backlog':
    case 'on_hold':
    case 'inactive':
      return 'bg-muted text-muted-foreground border-border';
    case 'cancelled':
    case 'rejected':
    case 'blacklisted':
      return 'bg-destructive/20 text-destructive border-destructive/30';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
}
