# Compliance Checklist (RBAC & Audit)

- RBAC roles configured (admin, facility_manager, healthcare_worker, data_entry_clerk)
- Collection permissions applied in Appwrite
- Facility isolation enforced at document-level
- Access attempts logged (access_audit_log)
- Role changes logged (role_change_log)
- Least privilege verified for each role
- Admin-only operations validated
- Audit logs queryable by userId, timestamp, operation
- Documentation finalized