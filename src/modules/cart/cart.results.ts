// ====================================================
// QUERY RESULTS
// ====================================================

export interface CartValidationResult {
  isValid: boolean;
  status: string;
  errors: CartValidationError[];
}

export interface CartValidationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
