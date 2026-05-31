import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "UniLink - Admin",
    description: "UniLink - Admin",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
