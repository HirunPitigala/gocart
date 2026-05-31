'use client'
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { doc, getDoc, addDoc, collection } from "firebase/firestore"
import { useAuth } from "@/lib/AuthContext"
import { 
    GraduationCap, 
    Phone, 
    Mail, 
    Home, 
    MapPin, 
    Check, 
    AlertCircle, 
    CheckCircle,
    User,
    Calendar,
    MessageSquare,
    DollarSign,
    Lock,
    Loader2
} from "lucide-react"
import toast from "react-hot-toast"

const formatAmenity = (name) => {
    if (name === "wifi") return "Wi-Fi"
    if (name === "ac") return "A/C"
    if (name === "attachedBathroom") return "Attached Bathroom"
    if (name === "sharedBathroom") return "Shared Bathroom"
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

export default function BoardingDetail() {
    const { boardingId } = useParams()
    const router = useRouter()
    const { user, role, profile } = useAuth()

    const [boarding, setBoarding] = useState(null)
    const [providerProfile, setProviderProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    // Booking form states
    const [bookingPhone, setBookingPhone] = useState("")
    const [bookingEmail, setBookingEmail] = useState("")
    const [bookingRequirements, setBookingRequirements] = useState("")
    const [submittingBooking, setSubmittingBooking] = useState(false)

    // Booking success modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'LKR'

    useEffect(() => {
        const fetchBoardingData = async () => {
            try {
                setLoading(true)
                const docRef = doc(db, "uni_boardings", boardingId)
                const docSnap = await getDoc(docRef)
                
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setBoarding({ id: docSnap.id, ...data })

                    // Fetch service provider contact profile
                    const providerRef = doc(db, "serviceProviders", data.providerId)
                    const providerSnap = await getDoc(providerRef)
                    if (providerSnap.exists()) {
                        setProviderProfile(providerSnap.data())
                    }
                } else {
                    toast.error("Accommodation listing not found.")
                    router.push("/boarding")
                }
            } catch (error) {
                console.error("Error loading boarding detail:", error)
                toast.error("Failed to load details.")
            } finally {
                setLoading(false)
            }
        }
        
        if (boardingId) {
            fetchBoardingData()
        }
        window.scrollTo(0, 0)
    }, [boardingId])

    // Pre-fill student contact info once profile loads
    useEffect(() => {
        if (profile) {
            setBookingPhone(profile.phone || "")
            setBookingEmail(profile.email || "")
        }
    }, [profile])

    const handleBookingSubmit = async (e) => {
        e.preventDefault()

        if (!user) {
            toast.error("You must be logged in to request a booking.")
            return
        }

        if (!bookingPhone || !bookingEmail) {
            toast.error("Please provide your contact number and email address.")
            return
        }

        try {
            setSubmittingBooking(true)
            
            const bookingData = {
                boardingId: boarding.id,
                boardingTitle: boarding.title,
                providerId: boarding.providerId,
                providerName: boarding.providerName,
                providerEmail: providerProfile?.email || boarding.email || "",
                providerPhone: providerProfile?.phone || boarding.phone || "",
                studentId: user.uid,
                studentName: profile?.fullName || "Student",
                studentEmail: bookingEmail.trim(),
                studentPhone: bookingPhone.trim(),
                studentRequirements: bookingRequirements.trim(),
                status: "pending",
                createdAt: new Date().toISOString()
            }

            await addDoc(collection(db, "boarding_bookings"), bookingData)
            
            // Show Success Modal
            setShowSuccessModal(true)
            
            // Clear requirements
            setBookingRequirements("")
        } catch (error) {
            console.error("Error booking boarding:", error)
            toast.error("Failed to submit booking request. Please try again.")
        } finally {
            setSubmittingBooking(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[75vh]">
                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-slate-400 mt-4 animate-pulse">Loading accommodation details...</p>
            </div>
        )
    }

    if (!boarding) return null

    const imagesList = boarding.images && boarding.images.length > 0 ? boarding.images : []

    return (
        <div className="mx-6 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto mt-6">
                
                {/* Breadcrumbs */}
                <div className="text-slate-500 text-xs sm:text-sm mb-6 flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="hover:text-green-600 cursor-pointer transition-all" onClick={() => router.push("/")}>Home</span>
                    <span className="text-slate-300">/</span>
                    <span className="hover:text-green-600 cursor-pointer transition-all" onClick={() => router.push("/boarding")}>Uni Boarding</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-800 font-semibold truncate max-w-xs">{boarding.title}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* LEFT COLUMN: Gallery & Slides */}
                    <div className="lg:col-span-7 space-y-4">
                        
                        {/* Primary Active Image Area */}
                        <div className="bg-[#F9F9F9] h-[300px] sm:h-[450px] rounded-3xl overflow-hidden border border-slate-200/60 relative flex items-center justify-center">
                            {imagesList.length > 0 ? (
                                <img 
                                    src={imagesList[activeImageIndex]} 
                                    alt="boarding property" 
                                    className="w-full h-full object-cover transition-all duration-300"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-300">
                                    <Home size={72} />
                                    <span className="text-xs font-bold uppercase tracking-widest mt-2">No Photo Available</span>
                                </div>
                            )}
                        </div>

                        {/* Slide Thumbnails list */}
                        {imagesList.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto py-1">
                                {imagesList.map((url, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setActiveImageIndex(idx)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0 cursor-pointer transition-all ${
                                            activeImageIndex === idx 
                                            ? "border-green-600 ring-2 ring-green-600/10 scale-95" 
                                            : "border-slate-200 hover:border-slate-400"
                                        }`}
                                    >
                                        <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Description & Booking Form */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Specifications Panel */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 leading-snug">{boarding.title}</h1>
                                
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-500 font-medium">
                                    <div className="flex items-center gap-1">
                                        <GraduationCap size={15} className="text-green-600" />
                                        <span>{boarding.university}</span>
                                    </div>
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                    <div className="flex items-center gap-1">
                                        <MapPin size={15} className="text-pink-500" />
                                        <span className="truncate">{boarding.address}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Badge row */}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] font-bold px-3 py-1 bg-green-50 text-green-700 rounded-full uppercase tracking-wider">{boarding.roomType} Room</span>
                                <span className="text-[10px] font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full uppercase tracking-wider">Gender Pref: {boarding.gender}</span>
                            </div>

                            {/* Price Strip */}
                            <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Monthly Rent</span>
                                    <span className="text-xl font-extrabold text-slate-800">{currency} {boarding.rent.toLocaleString()}</span>
                                </div>
                                {boarding.deposit > 0 && (
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Security Deposit</span>
                                        <span className="text-sm font-semibold text-slate-600">{currency} {boarding.deposit.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Amenities Checklist */}
                            {boarding.amenities && boarding.amenities.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Key Amenities</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 font-medium">
                                        {boarding.amenities.map((amenity) => (
                                            <div key={amenity} className="flex items-center gap-1.5 text-slate-600">
                                                <div className="p-0.5 bg-green-100 text-green-700 rounded-full">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                                <span>{formatAmenity(amenity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description Block */}
                            <div className="space-y-2 border-t border-slate-100 pt-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rules & Details</h4>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{boarding.description}</p>
                            </div>
                        </div>

                        {/* BOOKING REQUEST FORM CARD */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md relative overflow-hidden">
                            
                            {!user ? (
                                /* Locked/Unauthenticated State */
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full">
                                        <Lock size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-slate-800 text-base">Booking Restricted</h3>
                                        <p className="text-xs text-slate-400 max-w-xs">You must be logged in as a student to book this accommodation room.</p>
                                    </div>
                                    <button 
                                        onClick={() => router.push("/login")}
                                        className="w-full max-w-xs py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition active:scale-98 cursor-pointer shadow-md shadow-indigo-600/10"
                                    >
                                        Login to Proceed
                                    </button>
                                </div>
                            ) : (
                                /* Logged-in Form State */
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">Request Booking</h3>
                                            <p className="text-[10px] text-slate-400">Send an inquiry directly to {boarding.providerName}</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Contact Number *</label>
                                            <input 
                                                type="tel"
                                                required
                                                disabled={submittingBooking}
                                                value={bookingPhone}
                                                onChange={e => setBookingPhone(e.target.value)}
                                                placeholder="+94 77 123 4567"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 bg-slate-50/50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Email Address *</label>
                                            <input 
                                                type="email"
                                                required
                                                disabled={submittingBooking}
                                                value={bookingEmail}
                                                onChange={e => setBookingEmail(e.target.value)}
                                                placeholder="student@university.edu"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50 bg-slate-50/50"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                <MessageSquare size={12} />
                                                Requirements / Custom Message
                                            </label>
                                            <textarea 
                                                rows="3"
                                                disabled={submittingBooking}
                                                value={bookingRequirements}
                                                onChange={e => setBookingRequirements(e.target.value)}
                                                placeholder="Specify moving date, roommates, or questions for the owner..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submittingBooking}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all active:scale-[0.98] mt-2 shadow-lg shadow-green-600/10 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                                        >
                                            {submittingBooking ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Sending Inquiry...
                                                </>
                                            ) : (
                                                <>
                                                    <Check size={18} />
                                                    Send Booking Request
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONFIRMATION POPUP MODAL */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-2xl p-6 text-center space-y-6">
                        
                        {/* Graphic checked tag */}
                        <div className="mx-auto w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                            <CheckCircle size={36} strokeWidth={2.5} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-800">Booking Request Sent!</h3>
                            <p className="text-sm text-slate-500">Your custom requirements have been successfully sent to the owner, who will contact you shortly.</p>
                        </div>

                        {/* Contact details grid card */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-left space-y-3">
                            <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-200 pb-1.5">Direct Owner Contact Info</h4>
                            
                            <div className="space-y-2.5 text-xs text-slate-700 font-medium">
                                <div className="flex items-center gap-2">
                                    <User className="text-green-600 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-500">Name:</span>
                                    <span className="text-slate-800 font-bold">{boarding.providerName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="text-indigo-500 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-500">Email:</span>
                                    <span className="text-slate-800 font-bold select-all">{providerProfile?.email || boarding.email || "Not provided"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="text-pink-500 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-500">Hotline:</span>
                                    <span className="text-slate-800 font-bold select-all">{providerProfile?.phone || boarding.phone || "Not provided"}</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                setShowSuccessModal(false)
                                router.push("/boarding")
                            }}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition active:scale-98 cursor-pointer shadow-md shadow-green-600/10"
                        >
                            Return to Boarding Shop
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
