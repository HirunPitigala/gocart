'use client'
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/components/Loading";

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // If not logged in, redirect to login page
                router.push("/login");
            } else if (allowedRoles && !allowedRoles.includes(role)) {
                // If logged in but role not authorized, redirect to their home dashboard
                if (role === "customer") {
                    router.push("/dashboard/customer");
                } else if (role === "service_provider") {
                    router.push("/dashboard/provider");
                } else if (role === "admin") {
                    router.push("/dashboard/admin");
                } else {
                    router.push("/");
                }
            }
        }
    }, [user, role, loading, router, allowedRoles]);

    // Show loading spinner while loading state resolves or while redirecting
    if (loading || !user || (allowedRoles && !allowedRoles.includes(role))) {
        return <Loading />;
    }

    return <>{children}</>;
}
