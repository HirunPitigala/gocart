'use client'
import { useState, useEffect } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    updateDoc 
} from "firebase/firestore"
import toast from "react-hot-toast"
import { 
    Users, 
    ShieldAlert, 
    BadgeAlert, 
    Plus, 
    LogOut, 
    LayoutDashboard, 
    Database, 
    Briefcase, 
    Mail, 
    Home,
    Utensils,
    ShoppingBag,
    Calendar,
    User,
    Phone,
    X,
    Check,
    BriefcaseIcon,
    Loader2,
    MapPin,
    ExternalLink,
    GraduationCap
} from "lucide-react"

const formatAmenity = (name) => {
    if (name === "wifi") return "Wi-Fi"
    if (name === "ac") return "A/C"
    if (name === "attachedBathroom") return "Attached Bathroom"
    if (name === "sharedBathroom") return "Shared Bathroom"
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

export default function AdminDashboard() {
    const { profile, logout } = useAuth()
    const [activeTab, setActiveTab] = useState("overview") // overview, requestedBoardings, requestedFoods

    // Dashboard overview collections data lists
    const [usersList, setUsersList] = useState([])
    const [providersList, setProvidersList] = useState([])
    const [loadingData, setLoadingData] = useState(true)

    // Platform-wide requested boarding bookings lists
    const [boardingRequests, setBoardingRequests] = useState([])
    const [loadingRequests, setLoadingRequests] = useState(false)

    // Platform-wide requested food orders
    const [foodOrders, setFoodOrders] = useState([])
    const [loadingFoodOrders, setLoadingFoodOrders] = useState(false)

    // Form inputs for new admin
    const [newAdminName, setNewAdminName] = useState("")
    const [newAdminEmail, setNewAdminEmail] = useState("")
    const [newAdminPassword, setNewAdminPassword] = useState("")
    const [addingAdmin, setAddingAdmin] = useState(false)

    // Fetch lists
    const fetchPlatformData = async () => {
        try {
            setLoadingData(true)
            
            // 1. Fetch all users
            const usersSnapshot = await getDocs(collection(db, "users"))
            const usersArr = []
            usersSnapshot.forEach(doc => {
                usersArr.push({ id: doc.id, ...doc.data() })
            })
            setUsersList(usersArr)

            // 2. Fetch all service providers
            const providersSnapshot = await getDocs(collection(db, "serviceProviders"))
            const providersArr = []
            providersSnapshot.forEach(doc => {
                providersArr.push({ id: doc.id, ...doc.data() })
            })
            setProvidersList(providersArr)

        } catch (error) {
            console.error("Error loading dashboard collections:", error)
        } finally {
            setLoadingData(false)
        }
    }

    // Fetch platform boarding requests
    const fetchBoardingRequests = async () => {
        setLoadingRequests(true)
        try {
            const querySnapshot = await getDocs(collection(db, "boarding_bookings"))
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort by request date descending
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setBoardingRequests(items)
        } catch (error) {
            console.error("Error fetching admin boarding requests:", error)
            toast.error("Failed to load boarding booking requests.")
        } finally {
            setLoadingRequests(false)
        }
    }

    // Fetch platform food orders
    const fetchFoodOrders = async () => {
        setLoadingFoodOrders(true)
        try {
            const querySnapshot = await getDocs(collection(db, "food_orders"))
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort by request date descending
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setFoodOrders(items)
        } catch (error) {
            console.error("Error fetching admin food orders:", error)
            toast.error("Failed to load food orders.")
        } finally {
            setLoadingFoodOrders(false)
        }
    }

    // Change status platform-wide
    const handleRequestStatusChange = async (requestId, newStatus) => {
        try {
            const docRef = doc(db, "boarding_bookings", requestId)
            await updateDoc(docRef, { status: newStatus })
            toast.success(`Booking status marked as ${newStatus}!`)
            
            // Update local state
            setBoardingRequests(prev => prev.map(item => 
                item.id === requestId ? { ...item, status: newStatus } : item
            ))
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Failed to update status. Please try again.")
        }
    }

    useEffect(() => {
        fetchPlatformData()
    }, [])

    useEffect(() => {
        if (activeTab === "requestedBoardings") {
            fetchBoardingRequests()
        } else if (activeTab === "requestedFoods") {
            fetchFoodOrders()
        }
    }, [activeTab])

    const handleAddAdmin = async (e) => {
        e.preventDefault()

        if (!newAdminName || !newAdminEmail || !newAdminPassword) {
            toast.error("Please fill in all fields.")
            return
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailRegex.test(newAdminEmail.trim())) {
            toast.error("Please enter a valid email address.")
            return
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
        if (!passwordRegex.test(newAdminPassword)) {
            toast.error("Password must be at least 8 characters long, and include at least one uppercase letter, one lowercase letter, one number, and one special character.")
            return
        }

        try {
            setAddingAdmin(true)

            const emailKey = newAdminEmail.toLowerCase().trim()
            
            // Save admin seeder document in Firestore securely via server-side endpoint
            const response = await fetch("/api/auth/add-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: newAdminName,
                    email: emailKey,
                    tempPassword: newAdminPassword
                })
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.message || "Failed to create admin profile.")
            }

            toast.success(`Admin setup for ${newAdminName} created successfully with encrypted credentials! They can now log in using this email.`)
            
            // Reset inputs
            setNewAdminName("")
            setNewAdminEmail("")
            setNewAdminPassword("")
            
            // Refresh counts
            await fetchPlatformData()
        } catch (error) {
            console.error("Error creating additional admin:", error)
            toast.error("Failed to register admin profile: " + error.message)
        } finally {
            setAddingAdmin(false)
        }
    }

    const students = usersList.filter(u => u.role === "customer")
    const admins = usersList.filter(u => u.role === "admin")

    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            <div className="min-h-screen bg-slate-50 flex flex-row">
                
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 text-white p-6 hidden lg:flex flex-col justify-between border-r border-slate-800">
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
                                        ? "bg-slate-800 text-green-400 font-semibold" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <LayoutDashboard size={18} />
                                    Admin Dashboard
                                </button>
                            </nav>

                            {/* Requested Services Navigation Group */}
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-6">Request History</p>
                            <nav className="space-y-2 mt-2">
                                <button 
                                    onClick={() => setActiveTab("requestedBoardings")}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                        activeTab === "requestedBoardings" 
                                        ? "bg-slate-800 text-green-400 font-semibold" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <Home size={18} />
                                    Requested Boardings
                                </button>
                                <button 
                                    onClick={() => setActiveTab("requestedFoods")}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                        activeTab === "requestedFoods" 
                                        ? "bg-slate-800 text-green-400 font-semibold" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <Utensils size={18} />
                                    Requested Foods
                                </button>
                                <button 
                                    disabled
                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-500 cursor-not-allowed opacity-50"
                                    title="Store requests coming soon"
                                >
                                    <ShoppingBag size={18} />
                                    Requested Products
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
                                    Administrative <span className="font-light text-slate-500">Control Panel</span>
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">Super Admin Role | Signed in as: {profile?.fullName || "Admin"}</p>
                            </div>
                            <button 
                                onClick={logout}
                                className="lg:hidden flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>

                        {/* Mobile Navigation Pills for Admin */}
                        <div className="lg:hidden flex flex-wrap gap-2 pt-2">
                            <button
                                onClick={() => setActiveTab("overview")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "overview" ? "bg-slate-800 text-green-400 font-semibold" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab("requestedBoardings")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "requestedBoardings" ? "bg-slate-800 text-green-400 font-semibold" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Boarding Bookings
                            </button>
                            <button
                                onClick={() => setActiveTab("requestedFoods")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    activeTab === "requestedFoods" ? "bg-slate-800 text-green-400 font-semibold" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Food Orders
                            </button>
                        </div>
                    </div>

                    {/* DYNAMIC VIEWPORTS */}
                    {activeTab === "overview" && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl">
                                
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</p>
                                        <h3 className="text-2xl font-semibold text-slate-800 mt-2">{loadingData ? "..." : students.length}</h3>
                                    </div>
                                    <div className="p-3 bg-green-500 text-white rounded-xl">
                                        <Users size={24} />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Providers</p>
                                        <h3 className="text-2xl font-semibold text-slate-800 mt-2">{loadingData ? "..." : providersList.length}</h3>
                                    </div>
                                    <div className="p-3 bg-indigo-500 text-white rounded-xl">
                                        <Briefcase size={24} />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Platform Admins</p>
                                        <h3 className="text-2xl font-semibold text-slate-800 mt-2">{loadingData ? "..." : admins.length}</h3>
                                    </div>
                                    <div className="p-3 bg-amber-500 text-white rounded-xl">
                                        <ShieldAlert size={24} />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Modules</p>
                                        <h3 className="text-2xl font-semibold text-slate-800 mt-2">3 Modules</h3>
                                    </div>
                                    <div className="p-3 bg-pink-500 text-white rounded-xl">
                                        <Database size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-6xl">
                                
                                {/* List Students/Providers */}
                                <div className="xl:col-span-2 space-y-8">
                                    
                                    {/* Students Table */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                        <h2 className="text-lg font-semibold text-slate-800">Enrolled Customers / Students</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-xs">
                                                        <th className="pb-3 font-semibold">Name</th>
                                                        <th className="pb-3 font-semibold">Email</th>
                                                        <th className="pb-3 font-semibold">Phone</th>
                                                        <th className="pb-3 font-semibold">University</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-slate-600">
                                                    {loadingData ? (
                                                        <tr><td colSpan="4" className="py-4 text-center">Loading student records...</td></tr>
                                                    ) : students.length === 0 ? (
                                                        <tr><td colSpan="4" className="py-4 text-center">No students registered yet.</td></tr>
                                                    ) : (
                                                        students.map(u => (
                                                            <tr key={u.id}>
                                                                <td className="py-3 font-medium text-slate-800">{u.fullName}</td>
                                                                <td className="py-3">{u.email}</td>
                                                                <td className="py-3">{u.phone}</td>
                                                                <td className="py-3 text-xs">{u.university}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Providers Table */}
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                                        <h2 className="text-lg font-semibold text-slate-800">Registered Service Providers</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-xs">
                                                        <th className="pb-3 font-semibold">Provider</th>
                                                        <th className="pb-3 font-semibold">Email</th>
                                                        <th className="pb-3 font-semibold">University</th>
                                                        <th className="pb-3 font-semibold">Services</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-slate-600">
                                                    {loadingData ? (
                                                        <tr><td colSpan="4" className="py-4 text-center">Loading provider records...</td></tr>
                                                    ) : providersList.length === 0 ? (
                                                        <tr><td colSpan="4" className="py-4 text-center">No providers registered yet.</td></tr>
                                                    ) : (
                                                        providersList.map(p => (
                                                            <tr key={p.id}>
                                                                <td className="py-3 font-medium text-slate-800">{p.providerName}</td>
                                                                <td className="py-3">{p.email}</td>
                                                                <td className="py-3 text-xs">{p.university}</td>
                                                                <td className="py-3">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.services?.map(s => (
                                                                            <span key={s} className="px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded capitalize">
                                                                                {s}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Add Admin Panel */}
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-800">Add More Admins</h2>
                                            <p className="text-slate-500 text-xs mt-1">Register additional admins to manage the university services platform.</p>
                                        </div>

                                        <form onSubmit={handleAddAdmin} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={newAdminName}
                                                    onChange={(e) => setNewAdminName(e.target.value)}
                                                    placeholder="Enter admin name"
                                                    className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={newAdminEmail}
                                                    onChange={(e) => setNewAdminEmail(e.target.value)}
                                                    placeholder="admin@unilink.edu"
                                                    className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Temporary Password</label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={newAdminPassword}
                                                    onChange={(e) => setNewAdminPassword(e.target.value)}
                                                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char"
                                                    className="appearance-none rounded-xl block w-full px-4 py-2.5 border border-slate-200 placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm transition-all"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={addingAdmin}
                                                className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl text-white bg-slate-800 hover:bg-slate-900 transition-all cursor-pointer active:scale-95 disabled:bg-slate-300"
                                            >
                                                <Plus size={16} />
                                                {addingAdmin ? "Registering admin..." : "Register Admin"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PLATFORM-WIDE REQUESTED BOARDINGS VIEW */}
                    {activeTab === "requestedBoardings" && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 max-w-6xl animate-fadeIn">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Home size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">Platform Booking Requests (Admin View)</h2>
                                        <p className="text-xs text-slate-400">Total global accommodation booking requests submitted on the UniLink platform</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchBoardingRequests}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                                >
                                    Refresh Requests
                                </button>
                            </div>

                            {loadingRequests ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-slate-400 mt-3 font-medium">Fetching active booking records...</p>
                                </div>
                            ) : boardingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 p-6 text-center">
                                    <div className="p-4 bg-green-50 text-green-500 rounded-full mb-4">
                                        <Calendar size={32} />
                                    </div>
                                    <p className="text-slate-700 font-semibold">No platform booking requests found</p>
                                    <p className="text-slate-400 text-xs mt-1">Global request logs are currently empty.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                                <th className="pb-3 pr-4">Property & Provider</th>
                                                <th className="pb-3 pr-4">Student Details</th>
                                                <th className="pb-3 pr-4">Inquiry Message</th>
                                                <th className="pb-3 pr-4">Date</th>
                                                <th className="pb-3 pr-4">Status</th>
                                                <th className="pb-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-600">
                                            {boardingRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-slate-50/40 transition-all">
                                                    <td className="py-4 pr-4 align-top space-y-1">
                                                        <div className="font-semibold text-slate-800 max-w-[200px] truncate" title={req.boardingTitle}>
                                                            {req.boardingTitle}
                                                        </div>
                                                        <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 select-all">
                                                            <BriefcaseIcon size={12} />
                                                            {req.providerName}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4 align-top space-y-1">
                                                        <div className="font-bold text-slate-700 flex items-center gap-1">
                                                            <User size={13} className="text-slate-400" />
                                                            {req.studentName}
                                                        </div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1 select-all">
                                                            <Mail size={12} />
                                                            {req.studentEmail}
                                                        </div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1 select-all">
                                                            <Phone size={12} />
                                                            {req.studentPhone}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4 align-top text-xs text-slate-500 italic max-w-xs whitespace-pre-line">
                                                        {req.studentRequirements ? `"${req.studentRequirements}"` : "No special notes."}
                                                    </td>
                                                    <td className="py-4 pr-4 align-top text-xs text-slate-400">
                                                        {new Date(req.createdAt).toLocaleDateString(undefined, { 
                                                            year: 'numeric', month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="py-4 pr-4 align-top">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                                            req.status === 'approved' 
                                                            ? 'bg-green-50 text-green-700 border border-green-200' 
                                                            : req.status === 'rejected' 
                                                            ? 'bg-red-50 text-red-700 border border-red-200' 
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 align-top text-right space-y-2">
                                                        {req.status === 'pending' ? (
                                                            <div className="flex justify-end gap-1.5">
                                                                <button 
                                                                    onClick={() => handleRequestStatusChange(req.id, "approved")}
                                                                    className="px-2.5 py-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleRequestStatusChange(req.id, "rejected")}
                                                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                                                                >
                                                                    Decline
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleRequestStatusChange(req.id, "pending")}
                                                                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                                                            >
                                                                Reset Status
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PLATFORM-WIDE REQUESTED FOODS VIEW */}
                    {activeTab === "requestedFoods" && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 max-w-6xl animate-fadeIn">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Utensils size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">Platform Food Orders (Admin View)</h2>
                                        <p className="text-xs text-slate-400">Total global food and daily meal parcel orders submitted on the UniLink platform</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchFoodOrders}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                                >
                                    Refresh Orders
                                </button>
                            </div>

                            {loadingFoodOrders ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-slate-400 mt-3 font-medium">Fetching active food orders...</p>
                                </div>
                            ) : foodOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 p-6 text-center">
                                    <div className="p-4 bg-green-50 text-green-500 rounded-full mb-4">
                                        <Utensils size={32} />
                                    </div>
                                    <p className="text-slate-700 font-semibold">No food orders found</p>
                                    <p className="text-slate-400 text-xs mt-1">Global food order logs are currently empty.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                                <th className="pb-3 pr-4">Meal & Provider</th>
                                                <th className="pb-3 pr-4">Student Details</th>
                                                <th className="pb-3 pr-4">Quantity & Price</th>
                                                <th className="pb-3 pr-4">Delivery Location</th>
                                                <th className="pb-3 pr-4">Instructions</th>
                                                <th className="pb-3 pr-4">Date Ordered</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-600">
                                            {foodOrders.map((order) => {
                                                const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'LKR';
                                                return (
                                                    <tr key={order.id} className="hover:bg-slate-50/40 transition-all">
                                                        <td className="py-4 pr-4 align-top space-y-1">
                                                            <div className="font-bold text-slate-800 text-sm">
                                                                {order.foodName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                                {order.category} | {order.mealType === "veg" ? "Veg" : "Non-Veg"}
                                                            </div>
                                                            <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 select-all pt-1">
                                                                <BriefcaseIcon size={12} />
                                                                {order.providerName || "Service Provider"}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 pr-4 align-top space-y-1">
                                                            <div className="font-bold text-slate-700 flex items-center gap-1">
                                                                <User size={13} className="text-slate-400" />
                                                                {order.studentName}
                                                            </div>
                                                            <div className="text-xs text-slate-400 flex items-center gap-1 select-all">
                                                                <Mail size={12} />
                                                                {order.studentEmail}
                                                            </div>
                                                            <div className="text-xs text-slate-400 flex items-center gap-1 select-all">
                                                                <Phone size={12} />
                                                                {order.studentPhone}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                                                <GraduationCap size={12} />
                                                                {order.studentUniversity}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 pr-4 align-top space-y-1">
                                                            <div className="font-bold text-slate-800">
                                                                {order.quantity} {order.quantity === 1 ? "parcel" : "parcels"}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                {currencySymbol} {order.pricePerUnit.toLocaleString()} / unit
                                                            </div>
                                                            <div className="text-xs font-extrabold text-green-700 pt-0.5">
                                                                Total: {currencySymbol} {order.totalPrice.toLocaleString()}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 pr-4 align-top space-y-1.5 max-w-[200px]">
                                                            <div className="text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                                                                {order.deliveryAddress}
                                                            </div>
                                                            {order.mapLink && (
                                                                <a 
                                                                    href={order.mapLink}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-lg transition"
                                                                >
                                                                    <MapPin size={10} />
                                                                    View on Map
                                                                    <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </td>
                                                        <td className="py-4 pr-4 align-top text-xs text-slate-500 italic max-w-[150px] whitespace-pre-line leading-relaxed">
                                                            {order.notes ? `"${order.notes}"` : "No instructions."}
                                                        </td>
                                                        <td className="py-4 pr-4 align-top text-xs text-slate-400">
                                                            {new Date(order.createdAt).toLocaleDateString(undefined, { 
                                                                year: 'numeric', month: 'short', day: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    )
}
