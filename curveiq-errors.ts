/**
 * Mensajes de error y validación localizados al español para la
 * comunicación con el backend de CurveIQ (FastAPI scoring engine).
 *
 * Uso típico:
 *   try {
 *     const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
 *     if (!res.ok) throw new CurveIQApiError(mapHttpStatus(res.status), res.status);
 *     return await res.json();
 *   } catch (e) {
 *     throw toCurveIQError(e);
 *   }
 */

export type CurveIQErrorCode =
  | "network"
  | "timeout"
  | "aborted"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "server"
  | "bad_gateway"
  | "unavailable"
  | "invalid_response"
  | "phi_detected"
  | "plausibility"
  | "unknown";

export const CURVEIQ_ERROR_MESSAGES: Record<CurveIQErrorCode, string> = {
  network:
    "No se pudo conectar con el motor de puntuación. Verifica la conexión de red e inténtalo de nuevo.",
  timeout:
    "El motor de puntuación tardó demasiado en responder. Reintenta en unos segundos.",
  aborted: "La solicitud fue cancelada antes de completarse.",
  unauthorized:
    "Sesión no válida o expirada. Vuelve a iniciar sesión para continuar.",
  forbidden:
    "No tienes permiso para realizar esta operación. Contacta al administrador clínico.",
  not_found:
    "No se encontró el recurso solicitado. Es posible que el escaneo o paciente ya no exista.",
  validation:
    "Los datos enviados no son válidos. Revisa las mediciones antropométricas y vuelve a intentarlo.",
  rate_limited:
    "Has superado el límite de solicitudes. Espera un momento antes de reintentar.",
  server:
    "Ocurrió un error interno en el motor de puntuación. El equipo técnico ha sido notificado.",
  bad_gateway:
    "El servicio de puntuación no está disponible temporalmente. Intenta de nuevo en breve.",
  unavailable:
    "El motor de puntuación está fuera de servicio por mantenimiento. Reintenta más tarde.",
  invalid_response:
    "La respuesta del motor de puntuación no tiene el formato esperado.",
  phi_detected:
    "Se detectó información identificable del paciente (PHI). La solicitud fue bloqueada por cumplimiento HIPAA.",
  plausibility:
    "La simulación queda fuera de los límites del modelo estadístico de forma. Ajusta los procedimientos.",
  unknown:
    "Ocurrió un error inesperado al procesar la solicitud. Inténtalo de nuevo.",
};

/** Mensajes específicos para validación de campos antropométricos. */
export const CURVEIQ_FIELD_MESSAGES = {
  required: "Este campo es obligatorio.",
  numeric: "Debe ser un valor numérico.",
  outOfRange: (min: number, max: number) =>
    `El valor debe estar entre ${min} y ${max}.`,
  negative: "No se permiten valores negativos.",
  invalidRatio: "La proporción debe estar entre 0 y 3.",
  invalidPercent: "El porcentaje debe estar entre 0 y 100.",
  missingMetric: (metric: string) => `Falta la métrica obligatoria: ${metric}.`,
  unknownArchetype: "El arquetipo seleccionado no es válido.",
  unknownProcedure: (id: string) => `Procedimiento desconocido: ${id}.`,
  exceedsProcedureLimit: (label: string, max: number) =>
    `${label} excede el máximo permitido (${max}).`,
} as const;

export class CurveIQApiError extends Error {
  readonly code: CurveIQErrorCode;
  readonly status?: number;
  readonly details?: unknown;
  /** Errores por campo cuando el backend responde 422. */
  readonly fieldErrors?: Record<string, string>;

  constructor(
    code: CurveIQErrorCode,
    status?: number,
    details?: unknown,
    fieldErrors?: Record<string, string>,
  ) {
    super(CURVEIQ_ERROR_MESSAGES[code]);
    this.name = "CurveIQApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Estructura típica de un error 422 de FastAPI:
 *   { detail: [{ loc: ["body", "metrics", "waist_hip_ratio"], msg: "...", type: "value_error.number.not_ge" }, ...] }
 */
export interface FastAPIValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  ctx?: { limit_value?: number; min?: number; max?: number; gt?: number; lt?: number; ge?: number; le?: number };
}

/** Traduce un único item de FastAPI a un mensaje de CURVEIQ_FIELD_MESSAGES. */
function translateValidationItem(item: FastAPIValidationItem): string {
  const t = item.type ?? "";
  const ctx = item.ctx ?? {};
  const min = ctx.min ?? ctx.ge ?? ctx.gt;
  const max = ctx.max ?? ctx.le ?? ctx.lt;

  if (t.includes("missing") || t === "value_error.missing") {
    return CURVEIQ_FIELD_MESSAGES.required;
  }
  if (t.includes("number") || t.includes("float") || t.includes("int") || t.includes("type_error")) {
    if (min != null && max != null) return CURVEIQ_FIELD_MESSAGES.outOfRange(min, max);
    if (t.includes("not_ge") || t.includes("greater_than_equal") || t.includes("not_gt")) {
      return CURVEIQ_FIELD_MESSAGES.negative;
    }
    return CURVEIQ_FIELD_MESSAGES.numeric;
  }
  if (t.includes("enum")) {
    return CURVEIQ_FIELD_MESSAGES.unknownArchetype;
  }
  // Fallback: usa el mensaje original si viene del backend, o genérico.
  return item.msg || CURVEIQ_ERROR_MESSAGES.validation;
}

/** Convierte el body 422 de FastAPI en un Record<campo, mensaje en español>. */
export function parseFastAPIValidation(body: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const detail =
    body && typeof body === "object" && "detail" in body
      ? (body as { detail: unknown }).detail
      : null;
  if (!Array.isArray(detail)) return out;

  for (const raw of detail) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as FastAPIValidationItem;
    const loc = Array.isArray(item.loc) ? item.loc : [];
    // Quita prefijos típicos como "body" / "query" / "path".
    const path = loc
      .filter((p, i) => !(i === 0 && (p === "body" || p === "query" || p === "path")))
      .map(String)
      .join(".");
    if (!path) continue;
    if (!out[path]) out[path] = translateValidationItem(item);
  }
  return out;
}

/**
 * Construye un CurveIQApiError a partir de una Response. Si es 422, parsea
 * el body como validación de FastAPI y rellena `fieldErrors`.
 */
export async function curveIQErrorFromResponse(res: Response): Promise<CurveIQApiError> {
  const code = mapHttpStatus(res.status);
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    /* ignore */
  }
  const fieldErrors = res.status === 422 ? parseFastAPIValidation(body) : undefined;
  return new CurveIQApiError(code, res.status, body, fieldErrors);
}

/** Mapea un código HTTP a un CurveIQErrorCode. */
export function mapHttpStatus(status: number): CurveIQErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 422 || status === 400) return "validation";
  if (status === 429) return "rate_limited";
  if (status === 502) return "bad_gateway";
  if (status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "server";
  return "unknown";
}

/** Normaliza cualquier error capturado a un CurveIQApiError con mensaje en español. */
export function toCurveIQError(err: unknown): CurveIQApiError {
  if (err instanceof CurveIQApiError) return err;

  if (err instanceof DOMException && err.name === "AbortError") {
    return new CurveIQApiError("aborted");
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout") || err.name === "TimeoutError") {
      return new CurveIQApiError("timeout");
    }
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed")
    ) {
      return new CurveIQApiError("network");
    }
  }
  return new CurveIQApiError("unknown", undefined, err);
}

/** Devuelve el mensaje localizado listo para mostrar al usuario. */
export function getCurveIQErrorMessage(err: unknown): string {
  return toCurveIQError(err).message;
}
