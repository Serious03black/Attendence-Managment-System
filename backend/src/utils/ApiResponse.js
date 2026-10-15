/**
 * Standardized success response envelope so the frontend can rely on
 * { success, statusCode, message, data } for every 2xx response.
 */
export class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
