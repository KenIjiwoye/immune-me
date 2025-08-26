# Security Rules and RBAC

This document summarizes RBAC, collection-level permissions, document-level validations, and audit logging.

- Roles: admin, facility_manager, healthcare_worker, data_entry_clerk
- Facility-based isolation enforced for non-admin roles (facility_only)
- Collection-level permissions defined in config/collection-permissions.json
- Document-level checks implemented by the validate-document-access function
- Audit logs written to access_audit_log; role changes logged to role_change_log

Run utilities:
- Teams bootstrap: node appwrite-backend/config/teams-setup.js
- Apply collection permissions: node appwrite-backend/utils/setup-security-rules.js