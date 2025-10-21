// Custom error classes for better error handling

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParsingError';
  }
}

// Standard API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Helper functions for creating consistent API responses
export const createSuccessResponse = <T>(data: T, message?: string): ApiSuccessResponse<T> => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return response;
};

export const createErrorResponse = (error: string, details?: string): ApiErrorResponse => {
  const response: ApiErrorResponse = {
    success: false,
    error,
  };
  if (details) {
    response.details = details;
  }
  return response;
};