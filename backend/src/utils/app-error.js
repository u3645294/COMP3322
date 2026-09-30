export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", fields } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    if (fields) {
      this.fields = fields;
    }
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request contains invalid values.", fields) {
    super(message, { status: 400, code: "VALIDATION_ERROR", fields });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required.") {
    super(message, { status: 401, code: "AUTHENTICATION_ERROR" });
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, { status: 403, code: "AUTHORIZATION_ERROR" });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(message, { status: 404, code: "NOT_FOUND" });
  }
}

export class ConflictError extends AppError {
  constructor(message = "The resource already exists.") {
    super(message, { status: 409, code: "CONFLICT" });
  }
}

export class DomainRuleError extends AppError {
  constructor(message = "The request violates a domain rule.", fields) {
    super(message, { status: 422, code: "DOMAIN_RULE_ERROR", fields });
  }
}

