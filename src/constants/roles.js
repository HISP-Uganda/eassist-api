export const ALLOWED_ROLES = Object.freeze([
  "Admin",
  "HelpDeskManager",
  "Agent",
  "EndUser",
]);

export function isAllowedRole(name) {
  return ALLOWED_ROLES.includes(String(name || "").trim());
}
