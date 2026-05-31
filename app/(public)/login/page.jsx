'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { auth, db } from "@/lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useAuth } from "@/lib/AuthContext"

export default function LoginPage() {
    const router = useRouter()
    const { user, role, loading: authLoading } = useAuth()
    const [loading, setLoading] = useState(false)

    // Form inputs
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    // Automatic redirect if already logged in
    useEffect(() => {
        if (user && role && !authLoading) {
            if (role === "customer") {
                router.push("/")
            } else if (role === "service_provider") {
                router.push("/dashboard/provider")
            } else if (role === "admin") {
                router.push("/dashboard/admin")
            }
        }
    }, [user, role, authLoading, router])

    const handleLogin = async (e) => {
        e.preventDefault()

        if (!email || !password) {
            toast.error("Please enter email and password.")
            return
        }

        try {
            setLoading(true)

            // 1. Verify admin credentials via backend API if it's an admin (to handle seeding & secure admin verification)
            try {
                const response = await fetch("/api/auth/admin-login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                })

                const result = await response.json()
                
                // If it is successfully identified as an admin login (whether super-admin, seeded, or newly seeding)
                if (response.ok && result.success) {
                    // Admin verified and seeded on server if needed. Now perform client-side Auth sign-in to establish the session.
                    await signInWithEmailAndPassword(auth, email, password)
                    toast.success("Logged in successfully!")
                    return
                } else if (response.status !== 404 || !result.isNotAdmin) {
                    // If it returned an error status other than 404 (Not Admin), throw it
                    throw new Error(result.message || "Admin login verification failed.")
                }
            } catch (err) {
                // If we get a real admin auth failure, propagation should stop here
                console.error("Admin verification check error:", err)
                toast.error(err.message || "Failed to verify admin credentials.")
                return
            }

            // 2. Perform the actual client-side Firebase Auth sign-in for normal users
            await signInWithEmailAndPassword(auth, email, password)
            toast.success("Logged in successfully!")
            
        } catch (error) {
            console.error("Login failure error:", error)
            if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                toast.error("Invalid email or password.")
            } else {
                toast.error(error.message || "Failed to log in. Please try again.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-semibold text-slate-800">
                        Welcome back to <span className="text-green-600">Uni</span>Link
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Sign in to access your dashboard
                    </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="mt-8 space-y-6">
                    <div className="rounded-md space-y-4">
                        
                        {/* Email Address */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Password
                                </label>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading || authLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {loading ? "Signing in..." : "Login"}
                        </button>
                    </div>

                    {/* Register Link */}
                    <div className="text-center text-sm text-slate-500 mt-4">
                        Don't have an account?{" "}
                        <Link href="/register" className="font-semibold text-green-600 hover:text-green-700 transition">
                            Register here
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
