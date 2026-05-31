'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

const universities = [
    "University of Colombo",
    "University of Peradeniya",
    "University of Sri Jayewardenepura",
    "University of Kelaniya",
    "University of Moratuwa",
    "University of Jaffna",
    "Eastern University, Sri Lanka",
    "Rajarata University of Sri Lanka",
    "University of Ruhuna",
    "Sabaragamuwa University of Sri Lanka",
    "South Eastern University of Sri Lanka",
    "Wayamba University of Sri Lanka",
    "Uva Wellassa University",
    "Open University of Sri Lanka",
    "University of the Visual and Performing Arts",
    "Gampaha Wickramarachchi University of Indigenous Medicine",
    "University of Vavuniya",
    "General Sir John Kotelawala Defence University",
    "Ocean University of Sri Lanka",
    "Buddhist and Pali University of Sri Lanka"
];

export default function RegisterPage() {
    const router = useRouter()
    const [role, setRole] = useState("customer") // "customer" or "provider"
    const [loading, setLoading] = useState(false)

    // Form inputs
    const [fullName, setFullName] = useState("")
    const [providerName, setProviderName] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [university, setUniversity] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    // OTP states
    const [isOtpSent, setIsOtpSent] = useState(false)
    const [otp, setOtp] = useState("")
    const [verifying, setVerifying] = useState(false)
    const [sendingOtp, setSendingOtp] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    // Password visibility states
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setInterval(() => {
                setResendCooldown(prev => prev - 1)
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [resendCooldown])

    // Searchable university dropdown state
    const [uniSearchQuery, setUniSearchQuery] = useState("")
    const [isUniDropdownOpen, setIsUniDropdownOpen] = useState(false)

    // Provider specific
    const [selectedServices, setSelectedServices] = useState({
        boarding: false,
        foods: false,
        store: false
    })

    const handleServiceChange = (serviceName) => {
        setSelectedServices(prev => ({
            ...prev,
            [serviceName]: !prev[serviceName]
        }))
    }

    const handleRegister = async (e) => {
        e.preventDefault()

        // Common validations
        if (!email || !phone || !university || !password || !confirmPassword) {
            toast.error("Please fill in all fields.")
            return
        }

        if (role === "customer" && !fullName) {
            toast.error("Please enter your Full Name.")
            return
        }

        if (role === "provider" && !providerName) {
            toast.error("Please enter your Business/Provider Name.")
            return
        }
        // 1. Email format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid email address.")
            return
        }

        // 2. Sri Lankan phone number validation (accepts +947xxxxxxxx, 947xxxxxxxx, 07xxxxxxxx, with or without spaces/dashes)
        const cleanPhone = phone.trim().replace(/[\s\-()]/g, "")
        const slPhoneRegex = /^(?:\+94|94|0)?7[0-9]{8}$/
        if (!slPhoneRegex.test(cleanPhone)) {
            toast.error("Please enter a valid Sri Lankan mobile number (e.g. +94771234567 or 0771234567).")
            return
        }

        // 3. Strong password validation (at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>_\-+=\[\]]).{8,}$/
        if (!passwordRegex.test(password)) {
            toast.error("Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.")
            return
        }

        // Service provider validation
        const servicesArray = Object.keys(selectedServices).filter(key => selectedServices[key])
        if (role === "provider" && servicesArray.length === 0) {
            toast.error("Please select at least one service you provide.")
            return
        }

        try {
            setLoading(true)

            const response = await fetch("/api/auth/register-otp/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    role,
                    email: email.trim(),
                    phone: phone.trim(),
                    university,
                    password,
                    fullName: role === "customer" ? fullName : "",
                    providerName: role === "provider" ? providerName : "",
                    services: servicesArray
                })
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.message || "Failed to send verification code.");
                return;
            }

            toast.success("Verification code sent to your email!");
            setIsOtpSent(true);
            setResendCooldown(60);
        } catch (error) {
            console.error("Registration error:", error)
            toast.error("Failed to send verification code. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || sendingOtp) return;

        try {
            setSendingOtp(true);
            const servicesArray = Object.keys(selectedServices).filter(key => selectedServices[key]);

            const response = await fetch("/api/auth/register-otp/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    role,
                    email: email.trim(),
                    phone: phone.trim(),
                    university,
                    password,
                    fullName: role === "customer" ? fullName : "",
                    providerName: role === "provider" ? providerName : "",
                    services: servicesArray
                })
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.message || "Failed to resend verification code.");
                return;
            }

            toast.success("A new verification code has been sent!");
            setResendCooldown(60);
        } catch (error) {
            console.error("Resend OTP error:", error);
            toast.error("Failed to resend verification code. Please try again.");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit verification code.");
            return;
        }

        try {
            setVerifying(true);

            const response = await fetch("/api/auth/register-otp/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim(),
                    otp: otp.trim()
                })
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.message || "Verification failed.");
                return;
            }

            try {
                await signInWithEmailAndPassword(auth, email.trim(), password);
                toast.success(role === "customer" ? "Student registration successful!" : "Service Provider registration successful!");
                if (role === "customer") {
                    router.push("/");
                } else {
                    router.push("/dashboard/provider");
                }
            } catch (loginError) {
                console.error("Auto login failed:", loginError);
                toast.success("Verification successful! Please log in with your credentials.");
                router.push("/login");
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error("Failed to verify code. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                
                {!isOtpSent ? (
                    <>
                        {/* Header */}
                        <div className="text-center">
                            <h2 className="text-3xl font-semibold text-slate-800">
                                Join <span className="text-green-600">Uni</span>Link
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Create an account to start selling or buying
                            </p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => { setRole("customer"); toast.dismiss(); }}
                                className={`w-1/2 py-3 text-sm font-medium border-b-2 transition-all ${
                                    role === "customer" 
                                    ? "border-green-500 text-green-600" 
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                Student / Customer
                            </button>
                            <button
                                onClick={() => { setRole("provider"); toast.dismiss(); }}
                                className={`w-1/2 py-3 text-sm font-medium border-b-2 transition-all ${
                                    role === "provider" 
                                    ? "border-green-500 text-green-600" 
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                                }`}
                            >
                                Service Provider
                            </button>
                        </div>

                        {/* Registration Form */}
                        <form onSubmit={handleRegister} className="mt-8 space-y-6">
                            <div className="rounded-md space-y-4">
                                
                                {/* Dynamic Name Input */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        {role === "customer" ? "Full Name" : "Business / Provider Name"}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={role === "customer" ? fullName : providerName}
                                        onChange={(e) => role === "customer" ? setFullName(e.target.value) : setProviderName(e.target.value)}
                                        placeholder={role === "customer" ? "Enter your full name" : "Enter your business name"}
                                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>

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
                                        placeholder="name@university.edu"
                                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+94 77 123 4567"
                                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                    />
                                </div>

                                {/* University Name (Searchable Dropdown) */}
                                <div className="relative">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        University Name
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={uniSearchQuery}
                                            onFocus={() => setIsUniDropdownOpen(true)}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setIsUniDropdownOpen(false);
                                                }, 200);
                                            }}
                                            onChange={(e) => {
                                                setUniSearchQuery(e.target.value);
                                                setUniversity(e.target.value);
                                                setIsUniDropdownOpen(true);
                                            }}
                                            placeholder="Search or select your university"
                                            className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Dropdown List */}
                                    {isUniDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 focus:outline-none">
                                            {universities
                                                .filter(uni => uni.toLowerCase().includes(uniSearchQuery.toLowerCase()))
                                                .map((uni) => (
                                                    <div
                                                        key={uni}
                                                        onMouseDown={() => {
                                                            setUniversity(uni);
                                                            setUniSearchQuery(uni);
                                                            setIsUniDropdownOpen(false);
                                                        }}
                                                        className="px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 cursor-pointer transition-all"
                                                    >
                                                        {uni}
                                                    </div>
                                                ))}
                                            {universities.filter(uni => uni.toLowerCase().includes(uniSearchQuery.toLowerCase())).length === 0 && (
                                                <div className="px-4 py-3 text-sm text-slate-400 italic">
                                                    No matching universities found
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Service Provider Checkboxes */}
                                {role === "provider" && (
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                            Services Provided
                                        </label>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3 cursor-pointer text-slate-700 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServices.boarding}
                                                    onChange={() => handleServiceChange("boarding")}
                                                    className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500 cursor-pointer"
                                                />
                                                Uni-Boarding (Accommodation)
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer text-slate-700 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServices.foods}
                                                    onChange={() => handleServiceChange("foods")}
                                                    className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500 cursor-pointer"
                                                />
                                                Uni-Foods (Meals/Catering)
                                            </label>
                                            <label className="flex items-center gap-3 cursor-pointer text-slate-700 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServices.store}
                                                    onChange={() => handleServiceChange("store")}
                                                    className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500 cursor-pointer"
                                                />
                                                Uni-Store (Supplies/Essentials)
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char"
                                            className="appearance-none rounded-xl relative block w-full px-4 py-3 pr-12 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter password"
                                            className="appearance-none rounded-xl relative block w-full px-4 py-3 pr-12 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Registering account..." : "Sign Up"}
                                </button>
                            </div>

                            {/* Login Link */}
                            <div className="text-center text-sm text-slate-500 mt-4">
                                Already have an account?{" "}
                                <Link href="/login" className="font-semibold text-green-600 hover:text-green-700 transition">
                                    Login here
                                </Link>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        {/* OTP Verification Header */}
                        <div className="text-center">
                            <h2 className="text-3xl font-semibold text-slate-800">
                                Verify <span className="text-green-600">Email</span>
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                We've sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span>.
                                Please enter it below to complete your registration.
                            </p>
                        </div>

                        {/* OTP Form */}
                        <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
                            <div className="rounded-md space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        6-Digit Verification Code
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Enter 6-digit OTP"
                                        className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center tracking-[0.5em] font-bold transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={verifying || otp.length !== 6}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                                >
                                    {verifying ? "Verifying OTP..." : "Verify & Register"}
                                </button>

                                <div className="text-center text-sm text-slate-500 mt-4 flex flex-col items-center gap-2">
                                    <span>Didn't receive the code?</span>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={resendCooldown > 0 || sendingOtp}
                                        className="font-semibold text-green-600 hover:text-green-700 transition disabled:text-slate-400 disabled:cursor-not-allowed text-sm"
                                    >
                                        {resendCooldown > 0 
                                            ? `Resend OTP in ${resendCooldown}s` 
                                            : sendingOtp 
                                                ? "Sending..." 
                                                : "Resend OTP"
                                        }
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setIsOtpSent(false); setOtp(""); }}
                                        className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition underline cursor-pointer"
                                    >
                                        Change Email / Edit Details
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}
