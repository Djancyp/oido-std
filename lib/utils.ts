import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/* =========================
   Helpers
========================= */
function buildFlags(key: string, values?: string[]) {
  if (!values || values.length === 0) return [];
  return values.flatMap(v => [`--${key}`, v]);
}

function getOido() {
  const oido = process.env.OIDO_PATH;
  if (!oido) throw new Error('OIDO_PATH is not defined');
  return oido;
}

// Export the helper functions
export { buildFlags, getOido };
