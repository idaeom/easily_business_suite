"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";

interface ProtectProps {
    children: ReactNode;
    roles?: string[];
    permission?: string;
    fallback?: ReactNode;
}

export function Protect({ children, roles, permission, fallback = null }: ProtectProps) {
    const { data: session, status } = useSession();

    if (status === "loading") return null;

    if (!session?.user?.role) return <>{fallback}</>;

    const userRole = session.user.role;
    const userPermissions = session.user.permissions || [];

    // Admins bypass everything
    if (userRole === "ADMIN") {
        return <>{children}</>;
    }

    // 1. Check Role allowlist (if provided)
    if (roles && !roles.includes(userRole)) {
        // If roles failed, but maybe permission passes? 
        // Logic: If BOTH are provided, user needs EITHER role match OR permission match? 
        // OR: User must match Role AND Permission?
        // User Request: "Granularly toggle permissions". 
        // Interpretation: Permissions usually OVERRIDE or EXTEND roles. 
        // Let's say: If roles provided, must match. If permission provided, must match. 
        // If both provided, must match both.

        // Wait, typical RBAC: Roles are groups of permissions. 
        // If I say <Protect roles={['MANAGER']} permission="REFUND_SALE">
        // Does a MANAGER need REFUND_SALE explicitly? 
        // Usually Admin > Manager > User.

        // Let's implement: Passes if (Rolle Matches) OR (Permission Matches).
        // Actually, safer is "Must meet requirement". If I set roles=['MANAGER'], I expect only managers.
        // If I set permission='REFUND', I expect only those with refund.
        // If I set both, I probably want strict check. 

        // Let's keep it simple: Access granted if Role matches OR Permission matches.
        // BUT, `Protect` usually implies "Must have access".

        // Let's go with:
        // If `roles` is defined -> User must be in roles.
        // If `permission` is defined -> User must have permission.

        // However, admins always pass.

        return <>{fallback}</>;
    }

    // 2. Check Permission (if provided)
    if (permission && !userPermissions.includes(permission)) {
        return <>{fallback}</>;
    }

    // If we get here, all checks passed
    return <>{children}</>;
}
