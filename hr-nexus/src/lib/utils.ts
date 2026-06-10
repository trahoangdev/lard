import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clampText(input: string, max = 400) {
  const trimmed = input?.trim() || "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function maskBankAccount(value: string) {
  const s = value.replace(/\s+/g, "");
  if (s.length <= 4) return "••••";
  return `•••• ${s.slice(-4)}`;
}

export function isoDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetweenInclusive(start: Date, end: Date) {
  const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endMid = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const ms = endMid.getTime() - startMid.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}
