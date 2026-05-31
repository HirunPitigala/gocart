'use client'
import { Suspense, useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, addDoc, updateDoc } from "firebase/firestore"
import { Search, Utensils, GraduationCap, MapPin, Loader2, Phone, Mail, Plus, Minus, Check, X, AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

function FoodCard({ food, onOrderTrigger }) {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'LKR'
    const coverImage = food.images && food.images.length > 0 ? food.images[0] : null
    const [quantity, setQuantity] = useState(1)

    const isSoldOut = food.availableParcels <= 0

    const incrementQty = () => {
        if (quantity < food.availableParcels) {
            setQuantity(prev => prev + 1)
        }
    }

    const decrementQty = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1)
        }
    }

    // Reset quantity if remaining limit drops below it
    useEffect(() => {
        if (quantity > food.availableParcels && food.availableParcels > 0) {
            setQuantity(food.availableParcels)
        }
    }, [food.availableParcels])

    return (
        <div className="group bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 relative">
            {/* Meal Visual Image Container */}
            <div className="bg-[#F6F6F6] h-44 w-full rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 relative mb-4">
                {coverImage ? (
                    <img 
                        src={coverImage} 
                        alt={food.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <Utensils size={36} className="text-slate-300" />
                        <span className="text-[10px] uppercase font-bold mt-1.5 tracking-widest text-slate-400">No Image</span>
                    </div>
                )}
                
                {/* Float meal type badge (Veg / Non-Veg) */}
                <span className={`absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs tracking-wider capitalize ${
                    food.mealType === "veg" 
                    ? "bg-green-500 text-white" 
                    : "bg-red-500 text-white"
                }`}>
                    {food.mealType === "veg" ? "Pure Veg" : "Non-Veg"}
                </span>

                {/* Float category badge */}
                <span className="absolute top-3 right-3 text-[9px] font-bold px-2.5 py-0.5 bg-indigo-600/90 text-white rounded-full shadow-xs tracking-wider capitalize">
                    {food.category}
                </span>
            </div>

            {/* Content & Details */}
            <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold text-slate-800 text-base leading-snug group-hover:text-green-600 transition-all truncate" title={food.name}>
                        {food.name}
                    </h3>
                    <p className="text-slate-500 text-xs line-clamp-2 mt-1 min-h-[32px]">{food.description}</p>
                    
                    {/* University Association */}
                    <div className="flex items-center gap-1.5 mt-2.5 text-slate-600 text-xs font-medium">
                        <GraduationCap size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{food.university || "UniLink Campus"}</span>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100 mt-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Price</span>
                            <span className="font-bold text-slate-800 text-base block -mt-0.5">{currency} {food.price.toLocaleString()}</span>
                        </div>
                        
                        {/* Dynamic remaining limit indicator */}
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Availability</span>
                            {isSoldOut ? (
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Sold Out</span>
                            ) : (
                                <span className="text-xs font-bold text-slate-700">{food.availableParcels} remaining</span>
                            )}
                        </div>
                    </div>

                    {/* Interactive Quantity Selector & Action Button */}
                    {!isSoldOut && (
                        <div className="mt-4 flex items-center justify-between gap-3 pt-2">
                            <div className="flex items-center border border-slate-200 rounded-xl px-1.5 py-1 bg-slate-50/50">
                                <button 
                                    onClick={decrementQty}
                                    disabled={quantity <= 1}
                                    className="p-1 hover:bg-white text-slate-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-8 text-center text-xs font-bold text-slate-700">{quantity}</span>
                                <button 
                                    onClick={incrementQty}
                                    disabled={quantity >= food.availableParcels}
                                    className="p-1 hover:bg-white text-slate-500 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <button
                                onClick={() => onOrderTrigger(food, quantity)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer text-center"
                            >
                                Order Now
                            </button>
                        </div>
                    )}

                    {isSoldOut && (
                        <button
                            disabled
                            className="w-full mt-4 bg-slate-100 text-slate-400 py-2.5 rounded-xl text-xs font-bold border border-slate-200 cursor-not-allowed text-center"
                        >
                            Sold Out Today
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function FoodShopContent() {
    const router = useRouter()
    const { user, profile } = useAuth()
    const [foods, setFoods] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("all") // all, breakfast, lunch, dinner, snacks

    // Order checkout modal state
    const [activeFoodItem, setActiveFoodItem] = useState(null)
    const [orderQty, setOrderQty] = useState(1)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [submittingOrder, setSubmittingOrder] = useState(false)

    // Checkout Form inputs
    const [fullName, setFullName] = useState("")
    const [phone, setPhone] = useState("")
    const [email, setEmail] = useState("")
    const [university, setUniversity] = useState("")
    const [address, setAddress] = useState("")
    const [mapLink, setMapLink] = useState("")
    const [notes, setNotes] = useState("")

    // Success Modal popup
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    const fetchFoods = async () => {
        try {
            setLoading(true)
            const querySnapshot = await getDocs(collection(db, "uni_foods"))
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort newer meals first
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setFoods(items)
        } catch (error) {
            console.error("Error fetching foods:", error)
            toast.error("Failed to load Uni Foods menu.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFoods()
        window.scrollTo(0, 0)
    }, [])

    // Triggered when clicking "Order Now" on a card
    const handleOrderTrigger = (food, quantity) => {
        if (!user) {
            toast.error("You must be logged in to order meals.")
            router.push("/login")
            return
        }
        
        setActiveFoodItem(food)
        setOrderQty(quantity)
        
        // Auto-populate student contact information
        setFullName(profile?.fullName || "")
        setPhone(profile?.phone || "")
        setEmail(user?.email || "")
        setUniversity(profile?.university || "")
        
        // Clear address and notes
        setAddress("")
        setMapLink("")
        setNotes("")
        
        setCheckoutOpen(true)
    }

    // Handles checkout submission
    const handleCheckoutSubmit = async (e) => {
        e.preventDefault()
        if (!fullName || !phone || !email || !university || !address) {
            toast.error("Please fill in all required fields.")
            return
        }

        try {
            setSubmittingOrder(true)
            
            const totalPrice = activeFoodItem.price * orderQty
            
            const orderData = {
                foodId: activeFoodItem.id,
                foodName: activeFoodItem.name,
                category: activeFoodItem.category,
                mealType: activeFoodItem.mealType,
                pricePerUnit: activeFoodItem.price,
                quantity: orderQty,
                totalPrice: totalPrice,
                providerId: activeFoodItem.providerId,
                providerName: activeFoodItem.providerName,
                studentId: user.uid,
                studentName: fullName.trim(),
                studentPhone: phone.trim(),
                studentEmail: email.trim(),
                studentUniversity: university.trim(),
                deliveryAddress: address.trim(),
                mapLink: mapLink.trim(),
                notes: notes.trim(),
                status: "ordered",
                createdAt: new Date().toISOString()
            }

            // 1. Save order to food_orders collection
            await addDoc(collection(db, "food_orders"), orderData)

            // 2. Decrement available quantity on uni_foods document
            const newAvailable = Math.max(0, activeFoodItem.availableParcels - orderQty)
            const foodDocRef = doc(db, "uni_foods", activeFoodItem.id)
            await updateDoc(foodDocRef, { availableParcels: newAvailable })

            // 3. Close checkout modal and show success popup
            setCheckoutOpen(false)
            setShowSuccessModal(true)
            
            // 4. Refresh listings to update availabilities
            fetchFoods()
        } catch (error) {
            console.error("Error creating food order:", error)
            toast.error("Failed to submit order: " + error.message)
        } finally {
            setSubmittingOrder(false)
        }
    }

    const filteredFoods = foods.filter(item => {
        const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (item.university && item.university.toLowerCase().includes(searchQuery.toLowerCase())) ||
                             item.category.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = categoryFilter === "all" || item.category.toLowerCase() === categoryFilter.toLowerCase()
        return matchesQuery && matchesCategory
    })

    const currencySymbol = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'LKR'

    return (
        <div className="min-h-[80vh] mx-6">
            <div className="max-w-7xl mx-auto py-8">
                
                {/* Search Bar / Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
                            Uni-<span className="text-green-600 font-light">Foods</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Savor fresh daily meal plans prepared locally for your campus</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-full text-sm w-full md:max-w-md shadow-inner border border-slate-200/50">
                        <Search size={18} className="text-slate-500 flex-shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search by meal name or university..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none w-full text-slate-700 placeholder-slate-500" 
                        />
                    </div>
                </div>

                {/* Categories Tab Selector */}
                <div className="flex flex-wrap items-center gap-2 mb-8">
                    {["all", "breakfast", "lunch", "dinner", "snacks"].map(category => (
                        <button
                            key={category}
                            onClick={() => setCategoryFilter(category)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                categoryFilter === category 
                                ? "bg-green-600 text-white shadow-xs font-bold" 
                                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-80">
                        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold text-slate-400 mt-4 animate-pulse">Loading daily campus menus...</p>
                    </div>
                ) : filteredFoods.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-200/60 p-8 text-center shadow-xs">
                        <div className="p-4 bg-green-50 text-green-500 rounded-full mb-4">
                            <Utensils size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No meals available</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-md">No meal listings matched your search criteria or are published today. Try changing filters or check back shortly.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-32 animate-fadeIn">
                        {filteredFoods.map(food => (
                            <FoodCard 
                                key={food.id} 
                                food={food} 
                                onOrderTrigger={handleOrderTrigger} 
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* CHECKOUT MODAL WINDOW */}
            {checkoutOpen && activeFoodItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-100 shadow-xl overflow-hidden animate-scaleUp">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Complete Your Food Order</h3>
                                <p className="text-xs text-slate-400">Order from {activeFoodItem.providerName}</p>
                            </div>
                            <button 
                                onClick={() => setCheckoutOpen(false)}
                                className="p-1.5 hover:bg-slate-200/60 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Order Details Form */}
                        <form onSubmit={handleCheckoutSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
                            {/* Summary Card */}
                            <div className="bg-green-50/60 border border-green-100 rounded-2xl p-4 flex items-center justify-between text-sm">
                                <div className="space-y-0.5">
                                    <span className="font-bold text-slate-800 text-base">{activeFoodItem.name}</span>
                                    <span className="block text-xs text-slate-500 capitalize">{activeFoodItem.category} | {activeFoodItem.mealType === "veg" ? "Pure Veg" : "Non-Veg"}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 font-medium block">Qty: {orderQty} parcels</span>
                                    <span className="font-extrabold text-green-700 text-base">{currencySymbol} {(activeFoodItem.price * orderQty).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Form Input Grid */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Student / Delivery Details</h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Full Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all"
                                            placeholder="Student full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Phone Number *</label>
                                        <input 
                                            type="tel" 
                                            required
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all"
                                            placeholder="Contact hotline"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email Address *</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all"
                                            placeholder="Active mail"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Your University *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={university}
                                            onChange={e => setUniversity(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all"
                                            placeholder="University name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Delivery / Drop-Off Address *</label>
                                    <textarea 
                                        required
                                        rows={2}
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all resize-none"
                                        placeholder="Enter the hostel block, room number, or street address..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Location Map Link (Optional)</label>
                                    <input 
                                        type="url" 
                                        value={mapLink}
                                        onChange={e => setMapLink(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all"
                                        placeholder="Google Maps or Apple Maps shareable link..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Special Notes / Dietary Requirements</label>
                                    <textarea 
                                        rows={2}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 outline-none focus:border-green-500 focus:bg-white transition-all resize-none"
                                        placeholder="e.g. Extra spicy, no onions, leave at the desk, etc..."
                                    />
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setCheckoutOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingOrder}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                    {submittingOrder ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            Ordering...
                                        </>
                                    ) : (
                                        "Confirm & Place Order"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ORDER SUCCESS POPUP MODAL */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center border border-slate-100 shadow-xl overflow-hidden animate-scaleUp space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100">
                            <Check size={24} className="stroke-[3]" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-800">Order Placed Successfully!</h3>
                            <p className="text-slate-400 text-xs px-2 leading-relaxed">
                                Your food parcel booking has been successfully sent to the UniLink Administrator. They will contact you shortly.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs active:scale-98"
                        >
                            Got it, Thanks!
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function FoodsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[75vh]">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-400 mt-4 animate-pulse">Loading Uni Foods portal...</p>
            </div>
        }>
            <FoodShopContent />
        </Suspense>
    )
}
