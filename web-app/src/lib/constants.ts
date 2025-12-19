export const TASK_ROLES = {
    ASSIGNOR: "ASSIGNOR",
    ASSIGNEE: "ASSIGNEE",
    CERTIFIER: "CERTIFIER",
    APPROVER: "APPROVER",
    OBSERVER: "OBSERVER",
} as const;

export type TaskRole = keyof typeof TASK_ROLES;
