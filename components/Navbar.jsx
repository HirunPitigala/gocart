'use client'
import { Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useAuth } from "@/lib/AuthContext";

const Navbar = () => {

    const router = useRouter();
    const { user, role, profile, logout } = useAuth();

    const [search, setSearch] = useState('')
    const cartCount = useSelector(state => state.cart.total)

    const handleSearch = (e) => {
        e.preventDefault()
        router.push(`/shop?search=${search}`)
    }

    return (
        <nav className="relative bg-white">
            <div className="mx-6">
                <div className="flex items-center justify-between max-w-7xl mx-auto py-4  transition-all">

                    <Link href="/" className="relative text-4xl font-semibold text-slate-700">
                        <span className="text-green-600">Uni</span>Link
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600">
                        <Link href="/">Home</Link>
                        <Link href="/boarding">Uni Boarding</Link>
                        <Link href="/foods">Uni Foods</Link>
                        <Link href="/shop">Uni Marketplace</Link>

                        <form onSubmit={handleSearch} className="hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full">
                            <Search size={18} className="text-slate-600" />
                            <input className="w-full bg-transparent outline-none placeholder-slate-600" type="text" placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} required />
                        </form>



                        {user ? (
                            <div className="flex items-center gap-4">
                                {role === "customer" ? (
                                    <Link 
                                        href="/dashboard/customer"
                                        className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm cursor-pointer"
                                        title="View Dashboard"
                                    >
                                        {profile?.fullName ? profile.fullName.trim()[0].toUpperCase() : "S"}
                                    </Link>
                                ) : (
                                    <Link 
                                        href={role === "service_provider" ? "/dashboard/provider" : "/dashboard/admin"}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full text-sm font-medium transition"
                                    >
                                        Dashboard
                                    </Link>
                                )}
                                <button 
                                    onClick={logout}
                                    className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-sm font-medium transition cursor-pointer"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => router.push("/login")}
                                className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full font-medium cursor-pointer"
                            >
                                Login
                            </button>
                        )}

                    </div>

                    {/* Mobile User Button  */}
                    <div className="sm:hidden">
                        {user ? (
                            <div className="flex items-center gap-2">
                                {role === "customer" ? (
                                    <Link 
                                        href="/dashboard/customer"
                                        className="w-8 h-8 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer"
                                        title="View Dashboard"
                                    >
                                        {profile?.fullName ? profile.fullName.trim()[0].toUpperCase() : "S"}
                                    </Link>
                                ) : (
                                    <Link 
                                        href={role === "service_provider" ? "/dashboard/provider" : "/dashboard/admin"}
                                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-xs text-white rounded-full font-medium transition"
                                    >
                                        Dash
                                    </Link>
                                )}
                                <button 
                                    onClick={logout}
                                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-xs text-slate-700 rounded-full font-medium transition cursor-pointer"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => router.push("/login")}
                                className="px-7 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-sm transition text-white rounded-full font-medium cursor-pointer"
                            >
                                Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <hr className="border-gray-300" />
        </nav>
    )
}

export default Navbar