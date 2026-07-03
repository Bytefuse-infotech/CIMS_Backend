/**
 * Shared enums — the single source of truth for the API contract.
 * Later extracted to the `coaching-shared` package and consumed by all three repos.
 */

/** Tenant-realm user roles (institute users). */
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PARENT = 'parent',
}

/** Platform-realm super roles (the SaaS owner). */
export enum SuperRole {
  OWNER = 'owner',
  SUPPORT = 'support',
}

/** Which auth realm a JWT belongs to. The two are structurally distinct and never interchangeable. */
export enum Realm {
  TENANT = 'tenant',
  PLATFORM = 'platform',
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  DISABLED = 'disabled',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
}

export enum PlanTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum InvoiceStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum PaymentStatus {
  CREATED = 'created',
  CAPTURED = 'captured',
  FAILED = 'failed',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
}

export enum AttendanceSource {
  MANUAL = 'manual',
  BIOMETRIC = 'biometric',
}

export enum MaterialType {
  VIDEO = 'video',
  PDF = 'pdf',
  DOC = 'doc',
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  LOST = 'lost',
}

export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
}

export enum NotificationStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
}
