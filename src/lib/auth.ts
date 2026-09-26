import { timingSafeEqual } from "node:crypto";

export function hasToken(request: Request, expected: string | undefined): boolean {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function operatorFor(request: Request): string | null {
  const raw = process.env.CONTROL_OPERATORS_JSON;
  if (raw) {
    try {
      const operators = JSON.parse(raw) as Record<string, string>;
      for (const [name, token] of Object.entries(operators)) if (hasToken(request, token)) return name;
    } catch { return null; }
  }
  if (hasToken(request, process.env.CONTROL_TOKEN) && process.env.OPERATOR_NAME) return process.env.OPERATOR_NAME;
  return null;
}
