'use client'
import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import { 
    GraduationCap, 
    Phone, 
    Mail, 
    LogOut, 
    LayoutDashboard, 
    ShoppingBag, 
    Utensils, 
    Home, 
    Calendar,
    User,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2
} from "lucide-react"
import toast from "react-hot-toast"

export default function CustomerDashboard() {
    const { user, profile, logout } = useAuth()
    const [activeTab, setActiveTab] = useState("overview") // overview, myBookings
    const [bookings, setBookings] = useState([])
    const [loadingBookings, setLoadingBookings] = useState(false)

    const fetchMyBookings = async () => {
        if (!user?.uid) return
        setLoadingBookings(true)
        try {
            const q = query(collection(db, "boarding_bookings"), where("studentId", "==", user.uid))
            const querySnapshot = await getDocs(q)
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort by request date descending
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setBookings(items)
        } catch (error) {
            console.error("Error fetching customer bookings:", error)
            toast.error("Failed to load your booking history.")
        } finally {
            setLoadingBookings(false)
        }
    }

    useEffect(() => {
        if (activeTab === "myBookings" && user?.uid) {
            fetchMyBookings()
        }
    }, [activeTab, user?.uid])

    return (
        <ProtectedRoute allowedRoles={["customer"]}>
            <div className="min-h-screen bg-slate-50 flex flex-row">
                
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold tracking-wider text-green-500">
                            Uni<span className="text-white">Link.</span>
                        </h2>
                        
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
                            <nav className="space-y-2">
                                <button 
                                    onClick={() => setActiveTab("overview")}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                        activeTab === "overview" 
                                        ? "bg-slate-800 text-green-400 font-semibold shadow-md shadow-green-600/5" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <LayoutDashboard size={18} />
                                    My Dashboard
                                </button>
                                <button 
                                    onClick={() => setActiveTab("myBookings")}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                        activeTab === "myBookings" 
                                        ? "bg-slate-800 text-green-400 font-semibold shadow-md shadow-green-600/5" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <Calendar size={18} />
                                    My Bookings
                                </button>
                            </nav>
                        </div>
                    </div>
                    
                    <button 
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all cursor-pointer"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-800">
                                    Student <span className="font-light text-slate-500">Dashboard</span>
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">Welcome back, {profile?.fullName || "Student"}</p>
                            </div>
                            <button 
                                onClick={logout}
                                className="md:hidden flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-all"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>

                        {/* Mobile Navigation Pills */}
                        <div className="md:hidden flex gap-2 pt-1">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "overview" ? "bg-slate-800 text-green-400 font-semibold" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab("myBookings")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "myBookings" ? "bg-slate-800 text-green-400 font-semibold" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Bookings
                            </button>
                        </div>
                    </div>

                    {/* DYNAMIC VIEWPORTS */}
                    {activeTab === "overview" && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Profile Card */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs max-w-4xl">
                                <h2 className="text-lg font-semibold text-slate-800 mb-6">Personal Profile</h2>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    
                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="p-3 bg-green-500 text-white rounded-xl">
                                            <GraduationCap size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">University</p>
                                            <p className="text-sm font-bold text-slate-700 truncate">{profile?.university || "Not provided"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="p-3 bg-indigo-500 text-white rounded-xl">
                                            <Mail size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                                            <p className="text-sm font-bold text-slate-700 truncate select-all">{profile?.email || "Not provided"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="p-3 bg-pink-500 text-white rounded-xl">
                                            <Phone size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact</p>
                                            <p className="text-sm font-bold text-slate-700 truncate select-all">{profile?.phone || "Not provided"}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="p-3 bg-amber-500 text-white rounded-xl">
                                            <LayoutDashboard size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Role</p>
                                            <p className="text-sm font-bold text-slate-700 capitalize">Student</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Services Module */}
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-slate-800">University Modules & Services</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
                                    
                                    {/* Boarding Card */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-green-500 shadow-sm transition-all group flex flex-col justify-between h-48 cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all">
                                                <Home size={24} />
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full">Available</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Boarding</h3>
                                            <p className="text-slate-500 text-xs mt-1">Discover, verify, and book secure student boarding accommodations near university.</p>
                                        </div>
                                    </div>

                                    {/* Food Card */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-amber-500 shadow-sm transition-all group flex flex-col justify-between h-48 cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all">
                                                <Utensils size={24} />
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">Available</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Foods</h3>
                                            <p className="text-slate-500 text-xs mt-1">Pre-order healthy campus meals, daily boarding catering plans, and fast deliveries.</p>
                                        </div>
                                    </div>

                                    {/* Store Card */}
                                    <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-500 shadow-sm transition-all group flex flex-col justify-between h-48 cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <ShoppingBag size={24} />
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">Available</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Store</h3>
                                            <p className="text-slate-500 text-xs mt-1">Buy and sell student supplies, learning materials, and dorm essentials.</p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOOKINGS HISTORY VIEW */}
                    {activeTab === "myBookings" && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 max-w-6xl animate-fadeIn">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">My Boarding Requests</h2>
                                        <p className="text-xs text-slate-400">Track status, notes, and direct host details once booking request gets approved</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchMyBookings}
                                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer active:scale-95"
                                >
                                    Refresh History
                                </button>
                            </div>

                            {loadingBookings ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <Loader2 size={32} className="animate-spin text-green-600" />
                                    <p className="text-sm font-semibold text-slate-400 mt-3">Fetching your request log...</p>
                                </div>
                            ) : bookings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 p-6 text-center">
                                    <div className="p-4 bg-green-50/50 text-green-500 rounded-full mb-4">
                                        <Calendar size={32} />
                                    </div>
                                    <p className="text-slate-700 font-semibold">No booking requests submitted yet</p>
                                    <p className="text-slate-400 text-xs mt-1 max-w-sm">Browse rooms in the boarding gallery and click "Request Booking" to secure a place.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {bookings.map((booking) => (
                                        <div key={booking.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row justify-between gap-6 hover:shadow-xs transition duration-300">
                                            
                                            {/* Details Left Panel */}
                                            <div className="space-y-3 flex-1">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h3 className="font-bold text-slate-800 text-base">{booking.boardingTitle}</h3>
                                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border ${
                                                        booking.status === 'approved' 
                                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                                        : booking.status === 'rejected' 
                                                        ? 'bg-red-50 text-red-700 border-red-200' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {booking.status}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-slate-500 space-y-1.5 font-medium">
                                                    <p className="flex items-center gap-1.5">
                                                        <Clock size={13} className="text-slate-400" />
                                                        <span>Submitted: {new Date(booking.createdAt).toLocaleDateString(undefined, {
                                                            year: 'numeric', month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}</span>
                                                    </p>
                                                    <p className="italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed max-w-xl text-slate-600">
                                                        Note sent: {booking.studentRequirements ? `"${booking.studentRequirements}"` : "No special message provided."}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Host Disclosure Panel */}
                                            <div className="w-full lg:w-80 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-center">
                                                {booking.status === "approved" ? (
                                                    <div className="space-y-2.5">
                                                        <h4 className="text-[10px] text-green-700 font-bold uppercase tracking-widest border-b border-green-200/80 pb-1.5 flex items-center gap-1">
                                                            <CheckCircle size={12} />
                                                            Direct Host Credentials
                                                        </h4>
                                                        <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                                                            <p className="flex items-center gap-1.5">
                                                                <User size={13} className="text-slate-400 flex-shrink-0" />
                                                                <span className="text-slate-500">Owner:</span>
                                                                <span className="text-slate-800 font-semibold">{booking.providerName}</span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5 select-all">
                                                                <Mail size={13} className="text-slate-400 flex-shrink-0" />
                                                                <span className="text-slate-500">Email:</span>
                                                                <span className="text-slate-800 font-bold">{booking.providerEmail || "Not provided"}</span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5 select-all">
                                                                <Phone size={13} className="text-slate-400 flex-shrink-0" />
                                                                <span className="text-slate-500">Hotline:</span>
                                                                <span className="text-slate-800 font-bold">{booking.providerPhone || "Not provided"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : booking.status === "rejected" ? (
                                                    <div className="text-center py-4 space-y-1.5 text-slate-400">
                                                        <AlertCircle size={24} className="mx-auto text-red-500" />
                                                        <p className="text-xs font-semibold text-slate-700">Request Declined</p>
                                                        <p className="text-[10px]">Contact details remain locked for declined bookings.</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-4 space-y-1.5 text-slate-400">
                                                        <Clock size={24} className="mx-auto text-amber-500" />
                                                        <p className="text-xs font-semibold text-slate-700">Pending Review</p>
                                                        <p className="text-[10px]">Direct host hotline details unlock automatically upon request approval.</p>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    )
}

