export function getPublicErrorMessage(
  error: unknown,
  fallback: string,
  environment = process.env.NODE_ENV,
) {
  if (environment !== "production" && error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  extras?: Record<string, unknown>,
) {
  return {
    body: {
      error: {
        code,
        message,
        ...extras,
      },
    },
    status,
  };
}
