import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "UniLink - Store Dashboard",
    description: "UniLink - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
