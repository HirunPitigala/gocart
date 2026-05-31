import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "UniLink - University Student Services",
    description: "UniLink - University Student Services Platform",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${outfit.className} antialiased`} suppressHydrationWarning>
                <AuthProvider>
                    <StoreProvider>
                        <Toaster />
                        {children}
                    </StoreProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
