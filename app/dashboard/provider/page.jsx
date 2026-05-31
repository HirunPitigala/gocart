'use client'
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/lib/AuthContext"
import { db } from "@/lib/firebase"
import { 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    query, 
    where,
    updateDoc 
} from "firebase/firestore"
import { 
    GraduationCap, 
    Phone, 
    Mail, 
    LogOut, 
    LayoutDashboard, 
    ShoppingBag, 
    Utensils, 
    Home, 
    Settings,
    Plus,
    Trash2,
    MapPin,
    Clock,
    DollarSign,
    Tag,
    Layers,
    Check,
    Info,
    Box,
    Sparkles,
    AlertCircle,
    Camera,
    X,
    Loader2,
    Edit2,
    CheckCircle2,
    Calendar,
    User
} from "lucide-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"

const formatAmenity = (name) => {
    if (name === "wifi") return "Wi-Fi"
    if (name === "ac") return "A/C"
    if (name === "attachedBathroom") return "Attached Bathroom"
    if (name === "sharedBathroom") return "Shared Bathroom"
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

export default function ProviderDashboard() {
    const { profile, logout, refreshProfile } = useAuth()
    const [activeTab, setActiveTab] = useState("overview") // overview, boarding, foods, store
    const [listings, setListings] = useState({ boarding: [], foods: [], store: [] })
    const [loadingListings, setLoadingListings] = useState(false)
    const [uploading, setUploading] = useState(false) // Track image upload state

    // PROFILE SERVICES EDIT STATE
    const [showServicesModal, setShowServicesModal] = useState(false)
    const [servicesSelection, setServicesSelection] = useState({
        boarding: false,
        foods: false,
        store: false
    })

    // ITEM EDITING ID STATE
    const [editingId, setEditingId] = useState(null) // ID of listing being edited

    // Selected image files & base64 preview states for forms
    const [boardingImages, setBoardingImages] = useState([])
    const [boardingPreviews, setBoardingPreviews] = useState([])
    const [boardingExistingImages, setBoardingExistingImages] = useState([]) // Existing Cloudinary URLs during edit

    const [foodsImages, setFoodsImages] = useState([])
    const [foodsPreviews, setFoodsPreviews] = useState([])
    const [foodsExistingImages, setFoodsExistingImages] = useState([]) // Existing Cloudinary URLs during edit

    const [storeImages, setStoreImages] = useState([])
    const [storePreviews, setStorePreviews] = useState([])
    const [storeExistingImages, setStoreExistingImages] = useState([]) // Existing Cloudinary URLs during edit

    // Form states
    const [boardingForm, setBoardingForm] = useState({
        title: "",
        rent: "",
        deposit: "",
        roomType: "single", // single, shared, apartment
        gender: "any", // male, female, any
        address: "",
        description: "",
        amenities: {
            wifi: false,
            attachedBathroom: false,
            sharedBathroom: false,
            ac: false,
            parking: false,
            kitchen: false,
            furnished: false
        }
    })

    const [foodsForm, setFoodsForm] = useState({
        name: "",
        price: "",
        category: "Lunch", // Breakfast, Lunch, Dinner, Beverages, Snacks
        mealType: "veg", // veg, non-veg
        description: "",
        includedItems: "",
        availableParcels: ""
    })

    const [storeForm, setStoreForm] = useState({
        name: "",
        price: "",
        category: "Stationery", // Stationery, Electronics, Books, Dorm Essentials, Others
        condition: "new", // new, like_new, used
        stock: "1",
        description: ""
    })

    const activeServices = profile?.services || []

    // Provider specific requested boardings
    const [boardingRequests, setBoardingRequests] = useState([])
    const [loadingRequests, setLoadingRequests] = useState(false)

    // Provider specific requested food orders
    const [foodOrders, setFoodOrders] = useState([])
    const [loadingFoodOrders, setLoadingFoodOrders] = useState(false)

    // Fetch provider boarding bookings from Firestore
    const fetchBoardingRequests = async () => {
        if (!profile?.uid) return
        setLoadingRequests(true)
        try {
            const q = query(collection(db, "boarding_bookings"), where("providerId", "==", profile.uid))
            const querySnapshot = await getDocs(q)
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort by request date descending
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setBoardingRequests(items)
        } catch (error) {
            console.error("Error fetching provider boarding requests:", error)
        } finally {
            setLoadingRequests(false)
        }
    }

    // Fetch provider food orders from Firestore
    const fetchFoodOrders = async () => {
        if (!profile?.uid) return
        setLoadingFoodOrders(true)
        try {
            const q = query(collection(db, "food_orders"), where("providerId", "==", profile.uid))
            const querySnapshot = await getDocs(q)
            const items = []
            querySnapshot.forEach(docSnap => {
                items.push({ id: docSnap.id, ...docSnap.data() })
            })
            // Sort by request date descending
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setFoodOrders(items)
        } catch (error) {
            console.error("Error fetching provider food orders:", error)
        } finally {
            setLoadingFoodOrders(false)
        }
    }

    // Handle provider requested boarding status updates
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
            console.error("Error updating boarding status:", error)
            toast.error("Failed to update status. Please try again.")
        }
    }

    // Dynamic requests trigger
    useEffect(() => {
        if (activeTab === "requestedBoardings" && profile?.uid) {
            fetchBoardingRequests()
        } else if (activeTab === "requestedFoods" && profile?.uid) {
            fetchFoodOrders()
        }
    }, [activeTab, profile?.uid])

    // Fetch listings from Firestore
    const fetchListings = async () => {
        if (!profile?.uid) return
        setLoadingListings(true)
        try {
            // Fetch Boardings
            if (activeServices.includes("boarding")) {
                const q = query(collection(db, "uni_boardings"), where("providerId", "==", profile.uid))
                const querySnapshot = await getDocs(q)
                const items = []
                querySnapshot.forEach((docSnap) => {
                    items.push({ id: docSnap.id, ...docSnap.data() })
                })
                setListings(prev => ({ ...prev, boarding: items }))
            }
            // Fetch Foods
            if (activeServices.includes("foods")) {
                const q = query(collection(db, "uni_foods"), where("providerId", "==", profile.uid))
                const querySnapshot = await getDocs(q)
                const items = []
                querySnapshot.forEach((docSnap) => {
                    items.push({ id: docSnap.id, ...docSnap.data() })
                })
                setListings(prev => ({ ...prev, foods: items }))
            }
            // Fetch Store
            if (activeServices.includes("store")) {
                const q = query(collection(db, "uni_stores"), where("providerId", "==", profile.uid))
                const querySnapshot = await getDocs(q)
                const items = []
                querySnapshot.forEach((docSnap) => {
                    items.push({ id: docSnap.id, ...docSnap.data() })
                })
                setListings(prev => ({ ...prev, store: items }))
            }
        } catch (error) {
            console.error("Error fetching listings:", error)
            toast.error("Failed to load your listings.")
        } finally {
            setLoadingListings(false)
        }
    }

    useEffect(() => {
        if (profile?.uid) {
            fetchListings()
        }
    }, [profile?.uid, profile?.services])

    // Triggered when opening services editor modal
    const handleOpenServicesModal = () => {
        setServicesSelection({
            boarding: activeServices.includes("boarding"),
            foods: activeServices.includes("foods"),
            store: activeServices.includes("store")
        })
        setShowServicesModal(true)
    }

    // Handles registered services profile toggle submission
    const handleServicesUpdate = async (e) => {
        e.preventDefault()
        const selected = Object.keys(servicesSelection).filter(key => servicesSelection[key])
        if (selected.length === 0) {
            toast.error("You must keep at least one registered service active!")
            return
        }

        try {
            setUploading(true)
            toast.loading("Saving registered services...", { id: "savingServices" })
            
            const providerRef = doc(db, "serviceProviders", profile.uid)
            await updateDoc(providerRef, {
                services: selected
            })
            
            await refreshProfile()
            toast.success("Active services updated successfully!", { id: "savingServices" })
            setShowServicesModal(false)
            setActiveTab("overview")
        } catch (error) {
            console.error("Error updating services profile:", error)
            toast.error("Failed to update active services.")
        } finally {
            setUploading(false)
        }
    }

    // Utility to handle local image selection & previews
    const handleImageChange = (e, setImages, setPreviews) => {
        const files = Array.from(e.target.files)
        if (files.length === 0) return

        setImages(prev => [...prev, ...files])

        const newPreviews = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
            })
        })

        Promise.all(newPreviews).then(base64s => {
            setPreviews(prev => [...prev, ...base64s])
        })
    }

    // Utility to delete selected local images before upload
    const handleImageDelete = (index, setImages, setPreviews) => {
        setImages(prev => prev.filter((_, i) => i !== index))
        setPreviews(prev => prev.filter((_, i) => i !== index))
    }

    // Utility to upload images to Cloudinary via backend
    const uploadImages = async (files) => {
        if (files.length === 0) return []
        
        const formData = new FormData()
        files.forEach(file => {
            formData.append("files", file)
        })

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        })

        if (!res.ok) {
            const errData = await res.json()
            throw new Error(errData.message || "Failed to upload images to Cloudinary")
        }

        const data = await res.json()
        return data.urls
    }

    // Handle delete listing
    const handleDeleteListing = async (collectionName, id, serviceKey) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this listing?")
        if (!confirmDelete) return

        try {
            await deleteDoc(doc(db, collectionName, id))
            toast.success("Listing deleted successfully!")
            setListings(prev => ({
                ...prev,
                [serviceKey]: prev[serviceKey].filter(item => item.id !== id)
            }))
            if (editingId === id) {
                handleCancelEdit()
            }
        } catch (error) {
            console.error("Error deleting listing:", error)
            toast.error("Failed to delete listing. Please try again.")
        }
    }

    // Load an item back into forms to transition into EDIT MODE
    const handleStartEdit = (item, serviceKey) => {
        setEditingId(item.id)
        
        // Scroll smoothly to form pane
        window.scrollTo({ top: 0, behavior: "smooth" })

        if (serviceKey === "boarding") {
            setBoardingForm({
                title: item.title,
                rent: String(item.rent),
                deposit: String(item.deposit || 0),
                roomType: item.roomType,
                gender: item.gender,
                address: item.address,
                description: item.description,
                amenities: {
                    wifi: item.amenities?.includes("wifi") || false,
                    attachedBathroom: item.amenities?.includes("attachedBathroom") || false,
                    sharedBathroom: item.amenities?.includes("sharedBathroom") || false,
                    ac: item.amenities?.includes("ac") || false,
                    parking: item.amenities?.includes("parking") || false,
                    kitchen: item.amenities?.includes("kitchen") || false,
                    furnished: item.amenities?.includes("furnished") || false
                }
            })
            setBoardingExistingImages(item.images || [])
            setBoardingImages([])
            setBoardingPreviews([])
        } else if (serviceKey === "foods") {
            setFoodsForm({
                name: item.name,
                price: String(item.price),
                category: item.category || "Lunch",
                mealType: item.mealType || "veg",
                description: item.description,
                includedItems: item.includedItems ? item.includedItems.join(", ") : "",
                availableParcels: item.availableParcels !== undefined ? String(item.availableParcels) : ""
            })
            setFoodsExistingImages(item.images || [])
            setFoodsImages([])
            setFoodsPreviews([])
        } else if (serviceKey === "store") {
            setStoreForm({
                name: item.name,
                price: String(item.price),
                category: item.category || "Stationery",
                condition: item.condition || "new",
                stock: String(item.stock || 1),
                description: item.description
            })
            setStoreExistingImages(item.images || [])
            setStoreImages([])
            setStorePreviews([])
        }
    }

    // Cancel edit and reset form
    const handleCancelEdit = () => {
        setEditingId(null)
        
        // Reset Boarding
        setBoardingImages([])
        setBoardingPreviews([])
        setBoardingExistingImages([])
        setBoardingForm({
            title: "",
            rent: "",
            deposit: "",
            roomType: "single",
            gender: "any",
            address: "",
            description: "",
            amenities: {
                wifi: false,
                attachedBathroom: false,
                sharedBathroom: false,
                ac: false,
                parking: false,
                kitchen: false,
                furnished: false
            }
        })

        // Reset Foods
        setFoodsImages([])
        setFoodsPreviews([])
        setFoodsExistingImages([])
        setFoodsForm({
            name: "",
            price: "",
            category: "Lunch",
            mealType: "veg",
            description: "",
            includedItems: "",
            availableParcels: ""
        })

        // Reset Store
        setStoreImages([])
        setStorePreviews([])
        setStoreExistingImages([])
        setStoreForm({
            name: "",
            price: "",
            category: "Stationery",
            condition: "new",
            stock: "1",
            description: ""
        })
    }

    // Submit Boarding (supports BOTH CREATE & UPDATE)
    const handleBoardingSubmit = async (e) => {
        e.preventDefault()
        if (!boardingForm.title || !boardingForm.rent || !boardingForm.address || !boardingForm.description) {
            toast.error("Please fill in all required fields.")
            return
        }

        try {
            setUploading(true)
            toast.loading(editingId ? "Updating listing..." : "Publishing listing...", { id: "boardingSubmit" })
            
            // Upload new photos to Cloudinary (if selected)
            const uploadedUrls = await uploadImages(boardingImages)
            const finalImages = [...boardingExistingImages, ...uploadedUrls]

            const activeAmenities = Object.keys(boardingForm.amenities).filter(k => boardingForm.amenities[k])
            const itemData = {
                title: boardingForm.title,
                rent: Number(boardingForm.rent),
                deposit: Number(boardingForm.deposit || 0),
                roomType: boardingForm.roomType,
                gender: boardingForm.gender,
                address: boardingForm.address,
                description: boardingForm.description,
                amenities: activeAmenities,
                images: finalImages
            }

            if (editingId) {
                // Update Doc
                const docRef = doc(db, "uni_boardings", editingId)
                await updateDoc(docRef, itemData)
                
                toast.success("Boarding accommodation updated successfully!", { id: "boardingSubmit" })
                
                // Update local listings state
                setListings(prev => ({
                    ...prev,
                    boarding: prev.boarding.map(item => item.id === editingId ? { ...item, ...itemData } : item)
                }))
            } else {
                // Create Doc
                const newDoc = {
                    providerId: profile.uid,
                    providerName: profile.providerName,
                    university: profile.university,
                    ...itemData,
                    createdAt: new Date().toISOString()
                }
                const docRef = await addDoc(collection(db, "uni_boardings"), newDoc)
                toast.success("Boarding accommodation published successfully!", { id: "boardingSubmit" })
                
                setListings(prev => ({
                    ...prev,
                    boarding: [{ id: docRef.id, ...newDoc }, ...prev.boarding]
                }))
            }

            // Reset Form and Mode
            handleCancelEdit()
        } catch (error) {
            console.error("Error submitting boarding:", error)
            toast.error("Failed to save boarding listing: " + error.message, { id: "boardingSubmit" })
        } finally {
            setUploading(false)
        }
    }

    // Submit Foods (supports BOTH CREATE & UPDATE)
    const handleFoodsSubmit = async (e) => {
        e.preventDefault()
        if (!foodsForm.name || !foodsForm.price || !foodsForm.description || !foodsForm.availableParcels) {
            toast.error("Please fill in all required fields.")
            return
        }

        try {
            setUploading(true)
            toast.loading(editingId ? "Updating meal item..." : "Adding meal item...", { id: "foodsSubmit" })
            
            const uploadedUrls = await uploadImages(foodsImages)
            const finalImages = [...foodsExistingImages, ...uploadedUrls]

            const includedArray = foodsForm.includedItems 
                ? foodsForm.includedItems.split(",").map(i => i.trim()).filter(Boolean)
                : []

            const itemData = {
                name: foodsForm.name,
                price: Number(foodsForm.price),
                category: foodsForm.category,
                mealType: foodsForm.mealType,
                description: foodsForm.description,
                includedItems: includedArray,
                availableParcels: Number(foodsForm.availableParcels),
                images: finalImages
            }

            if (editingId) {
                // Update
                const docRef = doc(db, "uni_foods", editingId)
                await updateDoc(docRef, itemData)
                toast.success("Meal item updated successfully!", { id: "foodsSubmit" })

                setListings(prev => ({
                    ...prev,
                    foods: prev.foods.map(item => item.id === editingId ? { ...item, ...itemData } : item)
                }))
            } else {
                // Create
                const newDoc = {
                    providerId: profile.uid,
                    providerName: profile.providerName,
                    university: profile.university,
                    ...itemData,
                    createdAt: new Date().toISOString()
                }
                const docRef = await addDoc(collection(db, "uni_foods"), newDoc)
                toast.success("Meal item published successfully!", { id: "foodsSubmit" })

                setListings(prev => ({
                    ...prev,
                    foods: [{ id: docRef.id, ...newDoc }, ...prev.foods]
                }))
            }

            handleCancelEdit()
        } catch (error) {
            console.error("Error submitting food:", error)
            toast.error("Failed to save food listing: " + error.message, { id: "foodsSubmit" })
        } finally {
            setUploading(false)
        }
    }

    // Submit Store Product (supports BOTH CREATE & UPDATE)
    const handleStoreSubmit = async (e) => {
        e.preventDefault()
        if (!storeForm.name || !storeForm.price || !storeForm.stock || !storeForm.description) {
            toast.error("Please fill in all required fields.")
            return
        }

        try {
            setUploading(true)
            toast.loading(editingId ? "Updating product..." : "Publishing product...", { id: "storeSubmit" })
            
            const uploadedUrls = await uploadImages(storeImages)
            const finalImages = [...storeExistingImages, ...uploadedUrls]

            const itemData = {
                name: storeForm.name,
                price: Number(storeForm.price),
                category: storeForm.category,
                condition: storeForm.condition,
                stock: Number(storeForm.stock),
                description: storeForm.description,
                images: finalImages
            }

            if (editingId) {
                // Update
                const docRef = doc(db, "uni_stores", editingId)
                await updateDoc(docRef, itemData)
                toast.success("Store product updated successfully!", { id: "storeSubmit" })

                setListings(prev => ({
                    ...prev,
                    store: prev.store.map(item => item.id === editingId ? { ...item, ...itemData } : item)
                }))
            } else {
                // Create
                const newDoc = {
                    providerId: profile.uid,
                    providerName: profile.providerName,
                    university: profile.university,
                    ...itemData,
                    createdAt: new Date().toISOString()
                }
                const docRef = await addDoc(collection(db, "uni_stores"), newDoc)
                toast.success("Store product added successfully!", { id: "storeSubmit" })

                setListings(prev => ({
                    ...prev,
                    store: [{ id: docRef.id, ...newDoc }, ...prev.store]
                }))
            }

            handleCancelEdit()
        } catch (error) {
            console.error("Error submitting store item:", error)
            toast.error("Failed to save store item: " + error.message, { id: "storeSubmit" })
        } finally {
            setUploading(false)
        }
    }

    return (
        <ProtectedRoute allowedRoles={["service_provider"]}>
            <div className="min-h-screen bg-slate-50 flex flex-row">
                
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col justify-between flex-shrink-0 border-r border-slate-800">
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold tracking-wider text-green-500">
                            Uni<span className="text-white">Link.</span>
                        </h2>
                        
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
                            <nav className="space-y-2">
                                <button 
                                    onClick={() => { setActiveTab("overview"); handleCancelEdit(); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        activeTab === "overview" 
                                        ? "bg-green-600 text-white shadow-md shadow-green-600/10" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <LayoutDashboard size={18} />
                                    Provider Dashboard
                                </button>

                                {/* Dynamic sidebar additions based on registered services */}
                                {activeServices.includes("boarding") && (
                                    <button 
                                        onClick={() => { setActiveTab("boarding"); handleCancelEdit(); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            activeTab === "boarding" 
                                            ? "bg-green-600 text-white shadow-md shadow-green-600/10" 
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        <Home size={18} />
                                        Add Uni Boarding
                                    </button>
                                )}

                                {activeServices.includes("foods") && (
                                    <button 
                                        onClick={() => { setActiveTab("foods"); handleCancelEdit(); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            activeTab === "foods" 
                                            ? "bg-green-600 text-white shadow-md shadow-green-600/10" 
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        <Utensils size={18} />
                                        Add Uni Foods
                                    </button>
                                )}

                                {activeServices.includes("store") && (
                                    <button 
                                        onClick={() => { setActiveTab("store"); handleCancelEdit(); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            activeTab === "store" 
                                            ? "bg-green-600 text-white shadow-md shadow-green-600/10" 
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        <ShoppingBag size={18} />
                                        Add Uni Store
                                    </button>
                                )}
                            </nav>
                            
                            {/* Requested Services Navigation Group */}
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-6">Request History</p>
                            <nav className="space-y-2 mt-2">
                                <button 
                                    onClick={() => { setActiveTab("requestedBoardings"); handleCancelEdit(); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        activeTab === "requestedBoardings" 
                                        ? "bg-green-600 text-white shadow-md shadow-green-600/10" 
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                    }`}
                                >
                                    <Home size={18} />
                                    Requested Boardings
                                </button>
                                {activeServices.includes("foods") ? (
                                    <button 
                                        onClick={() => { setActiveTab("requestedFoods"); handleCancelEdit(); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                                            activeTab === "requestedFoods" 
                                            ? "bg-slate-800 text-green-400 font-semibold" 
                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                        }`}
                                    >
                                        <Utensils size={18} />
                                        Requested Foods
                                    </button>
                                ) : (
                                    <button 
                                        disabled
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-500 cursor-not-allowed opacity-50"
                                        title="Enable foods service to view"
                                    >
                                        <Utensils size={18} />
                                        Requested Foods
                                    </button>
                                )}
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
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
                                    Provider <span className="font-light text-slate-500">Dashboard</span>
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">
                                    Welcome back, <span className="font-semibold text-slate-700">{profile?.providerName || "Service Provider"}</span>
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* Mobile Tab Selectors & Logout */}
                                <button 
                                    onClick={logout}
                                    className="md:hidden flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-all"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>

                        {/* MOBILE NAVIGATION PILLS */}
                        <div className="flex md:hidden flex-wrap gap-2 pt-2">
                            <button
                                onClick={() => { setActiveTab("overview"); handleCancelEdit(); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "overview" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Overview
                            </button>
                            {activeServices.includes("boarding") && (
                                <button
                                    onClick={() => { setActiveTab("boarding"); handleCancelEdit(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeTab === "boarding" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                    }`}
                                >
                                    Uni Boarding
                                </button>
                            )}
                            {activeServices.includes("foods") && (
                                <button
                                    onClick={() => { setActiveTab("foods"); handleCancelEdit(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeTab === "foods" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                    }`}
                                >
                                    Uni Foods
                                </button>
                            )}
                            {activeServices.includes("store") && (
                                <button
                                    onClick={() => { setActiveTab("store"); handleCancelEdit(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeTab === "store" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                    }`}
                                >
                                    Uni Store
                                </button>
                            )}
                            <span className="h-4 w-px bg-slate-300 mx-1 self-center"></span>
                            <button
                                onClick={() => { setActiveTab("requestedBoardings"); handleCancelEdit(); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === "requestedBoardings" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                Requests
                            </button>
                            {activeServices.includes("foods") && (
                                <button
                                    onClick={() => { setActiveTab("requestedFoods"); handleCancelEdit(); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        activeTab === "requestedFoods" ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700"
                                    }`}
                                >
                                    Food Orders
                                </button>
                            )}
                        </div>

                        {/* Sleek, Horizontal, One-Line Profile Bar */}
                        <div className="bg-slate-900 text-slate-100 px-6 py-4 rounded-2xl border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs tracking-wide">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="text-green-400 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-400 font-medium">Campus:</span>
                                    <span className="text-white font-semibold">{profile?.university || "Not assigned"}</span>
                                </div>
                                <div className="hidden lg:block h-4 w-px bg-slate-800"></div>
                                <div className="flex items-center gap-2">
                                    <Mail className="text-indigo-400 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-400 font-medium">Email:</span>
                                    <span className="text-white font-semibold">{profile?.email || "Not provided"}</span>
                                </div>
                                <div className="hidden lg:block h-4 w-px bg-slate-800"></div>
                                <div className="flex items-center gap-2">
                                    <Phone className="text-pink-400 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-400 font-medium">Hotline:</span>
                                    <span className="text-white font-semibold">{profile?.phone || "Not provided"}</span>
                                </div>
                                <div className="hidden lg:block h-4 w-px bg-slate-800"></div>
                                <div className="flex items-center gap-2">
                                    <Settings className="text-amber-400 w-4 h-4 flex-shrink-0" />
                                    <span className="text-slate-400 font-medium">Role:</span>
                                    <span className="text-white font-semibold capitalize bg-slate-800 px-2 py-0.5 rounded-md">Service Provider</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC CONTENT AREA */}
                    {activeTab === "overview" && (
                        <div className="space-y-8 animate-fadeIn">
                            {/* Subscribed Modules */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-semibold text-slate-800">My Registered Services</h2>
                                        <p className="text-xs text-slate-400">Manage and switch between your active service modules</p>
                                    </div>
                                    <button 
                                        onClick={handleOpenServicesModal}
                                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-green-500 hover:text-green-600 bg-white rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                        <Edit2 size={13} />
                                        Edit Registered Services
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                                    
                                    {/* Boarding Card */}
                                    <div 
                                        onClick={() => activeServices.includes("boarding") && setActiveTab("boarding")}
                                        className={`p-6 rounded-2xl border shadow-sm transition-all flex flex-col justify-between h-48 ${
                                            activeServices.includes("boarding") 
                                            ? "bg-white border-green-200 hover:border-green-500 hover:shadow-md cursor-pointer group" 
                                            : "bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`p-3 rounded-xl transition-all ${
                                                activeServices.includes("boarding") 
                                                ? "bg-green-500 text-white group-hover:scale-105" 
                                                : "bg-slate-200 text-slate-400"
                                            }`}>
                                                <Home size={24} />
                                            </div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                activeServices.includes("boarding") 
                                                ? "bg-green-50 text-green-700" 
                                                : "bg-slate-200 text-slate-500"
                                            }`}>
                                                {activeServices.includes("boarding") ? "Active Manager" : "Inactive"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Boarding</h3>
                                            <p className="text-slate-500 text-xs mt-1">Manage boarding rooms, student accommodation leases, and utility billings.</p>
                                        </div>
                                    </div>

                                    {/* Food Card */}
                                    <div 
                                        onClick={() => activeServices.includes("foods") && setActiveTab("foods")}
                                        className={`p-6 rounded-2xl border shadow-sm transition-all flex flex-col justify-between h-48 ${
                                            activeServices.includes("foods") 
                                            ? "bg-white border-amber-200 hover:border-amber-500 hover:shadow-md cursor-pointer group" 
                                            : "bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`p-3 rounded-xl transition-all ${
                                                activeServices.includes("foods") 
                                                ? "bg-amber-500 text-white group-hover:scale-105" 
                                                : "bg-slate-200 text-slate-400"
                                            }`}>
                                                <Utensils size={24} />
                                            </div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                activeServices.includes("foods") 
                                                ? "bg-amber-50 text-amber-700" 
                                                : "bg-slate-200 text-slate-500"
                                            }`}>
                                                {activeServices.includes("foods") ? "Active Manager" : "Inactive"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Foods</h3>
                                            <p className="text-slate-500 text-xs mt-1">Create food menus, monitor custom student meal plans, and track active deliveries.</p>
                                        </div>
                                    </div>

                                    {/* Store Card */}
                                    <div 
                                        onClick={() => activeServices.includes("store") && setActiveTab("store")}
                                        className={`p-6 rounded-2xl border shadow-sm transition-all flex flex-col justify-between h-48 ${
                                            activeServices.includes("store") 
                                            ? "bg-white border-indigo-200 hover:border-indigo-500 hover:shadow-md cursor-pointer group" 
                                            : "bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`p-3 rounded-xl transition-all ${
                                                activeServices.includes("store") 
                                                ? "bg-indigo-500 text-white group-hover:scale-105" 
                                                : "bg-slate-200 text-slate-400"
                                            }`}>
                                                <ShoppingBag size={24} />
                                            </div>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                activeServices.includes("store") 
                                                ? "bg-indigo-50 text-indigo-700" 
                                                : "bg-slate-200 text-slate-500"
                                            }`}>
                                                {activeServices.includes("store") ? "Active Manager" : "Inactive"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800">Uni-Store</h3>
                                            <p className="text-slate-500 text-xs mt-1">Add store inventory, manage student marketplace purchases, and review earnings.</p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* REGISTERED SERVICES EDITOR MODAL */}
                    {showServicesModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                            <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-6">
                                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Settings className="text-green-600 w-5 h-5" />
                                        <h3 className="text-lg font-bold text-slate-800">Edit Active Services</h3>
                                    </div>
                                    <button 
                                        disabled={uploading}
                                        onClick={() => setShowServicesModal(false)}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <form onSubmit={handleServicesUpdate} className="space-y-6">
                                    <p className="text-xs text-slate-500">Toggle the modules you provide. Modifying your services updates your dashboard navigation tabs and panels immediately.</p>

                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl cursor-pointer transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${servicesSelection.boarding ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    <Home size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">Uni-Boarding</p>
                                                    <p className="text-[10px] text-slate-400">Student Accommodation</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                disabled={uploading}
                                                checked={servicesSelection.boarding}
                                                onChange={() => setServicesSelection(prev => ({ ...prev, boarding: !prev.boarding }))}
                                                className="w-5 h-5 rounded text-green-600 border-slate-300 focus:ring-green-500 cursor-pointer"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl cursor-pointer transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${servicesSelection.foods ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    <Utensils size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">Uni-Foods</p>
                                                    <p className="text-[10px] text-slate-400">Meals & Daily Catering</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                disabled={uploading}
                                                checked={servicesSelection.foods}
                                                onChange={() => setServicesSelection(prev => ({ ...prev, foods: !prev.foods }))}
                                                className="w-5 h-5 rounded text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl cursor-pointer transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${servicesSelection.store ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    <ShoppingBag size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">Uni-Store</p>
                                                    <p className="text-[10px] text-slate-400">Marketplace dorm supplies</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="checkbox"
                                                disabled={uploading}
                                                checked={servicesSelection.store}
                                                onChange={() => setServicesSelection(prev => ({ ...prev, store: !prev.store }))}
                                                className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </label>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            type="button"
                                            disabled={uploading}
                                            onClick={() => setShowServicesModal(false)}
                                            className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-all text-center disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            disabled={uploading}
                                            className="w-1/2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-xs font-semibold text-white cursor-pointer shadow-md shadow-green-600/10 transition-all flex items-center justify-center gap-1.5 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={14} />
                                                    Save Services
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* BOARDINGS VIEW */}
                    {activeTab === "boarding" && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fadeIn">
                            
                            {/* Left Column: Form */}
                            <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Home size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {editingId ? "Edit Boarding Room" : "Add Boarding Room"}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {editingId ? "Modify this active accommodation's specs" : "List an accommodation for students"}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleBoardingSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Room / Property Title *</label>
                                        <input 
                                            type="text"
                                            required
                                            disabled={uploading}
                                            value={boardingForm.title}
                                            onChange={e => setBoardingForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g. Cozy Single Room near Colombo University"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rent per Month (LKR) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min="0"
                                                disabled={uploading}
                                                value={boardingForm.rent}
                                                onChange={e => setBoardingForm(prev => ({ ...prev, rent: e.target.value }))}
                                                placeholder="e.g. 15000"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Security Deposit (LKR)</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                disabled={uploading}
                                                value={boardingForm.deposit}
                                                onChange={e => setBoardingForm(prev => ({ ...prev, deposit: e.target.value }))}
                                                placeholder="e.g. 30000"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Room Type *</label>
                                            <select 
                                                value={boardingForm.roomType}
                                                disabled={uploading}
                                                onChange={e => setBoardingForm(prev => ({ ...prev, roomType: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="single">Single Room</option>
                                                <option value="shared">Shared Room</option>
                                                <option value="apartment">Full Apartment</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Gender Preference *</label>
                                            <select 
                                                value={boardingForm.gender}
                                                disabled={uploading}
                                                onChange={e => setBoardingForm(prev => ({ ...prev, gender: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="any">Any / Unisex</option>
                                                <option value="male">Male Students Only</option>
                                                <option value="female">Female Students Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Address / Location *</label>
                                        <input 
                                            type="text"
                                            required
                                            disabled={uploading}
                                            value={boardingForm.address}
                                            onChange={e => setBoardingForm(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder="e.g. 45/2, University Rd, Colombo 07"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description / Rules *</label>
                                        <textarea 
                                            required
                                            rows="2"
                                            disabled={uploading}
                                            value={boardingForm.description}
                                            onChange={e => setBoardingForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Specify guidelines, bills included, or distance to university campus..."
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Amenities</label>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-700">
                                            {Object.keys(boardingForm.amenities).map((amenity) => (
                                                <label key={amenity} className="flex items-center gap-2 cursor-pointer capitalize">
                                                    <input 
                                                        type="checkbox"
                                                        disabled={uploading}
                                                        checked={boardingForm.amenities[amenity]}
                                                        onChange={() => setBoardingForm(prev => ({
                                                            ...prev,
                                                            amenities: {
                                                                ...prev.amenities,
                                                                [amenity]: !prev.amenities[amenity]
                                                            }
                                                        }))}
                                                        className="w-4 h-4 rounded text-green-600 border-slate-300 focus:ring-green-500 cursor-pointer disabled:opacity-50"
                                                    />
                                                    {formatAmenity(amenity)}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* BOARDING PHOTO UPLOADER */}
                                    <div className="space-y-3 pt-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Property Photos</label>
                                        <div className="flex flex-col gap-3">
                                            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-green-500 hover:bg-green-50/20 py-3 rounded-xl cursor-pointer transition-all">
                                                <Camera size={18} className="text-slate-400" />
                                                <span className="text-xs text-slate-600 font-semibold">Select Photos (Multiple)</span>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    disabled={uploading}
                                                    className="hidden" 
                                                    onChange={e => handleImageChange(e, setBoardingImages, setBoardingPreviews)} 
                                                />
                                            </label>

                                            {(boardingExistingImages.length > 0 || boardingPreviews.length > 0) && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {/* Existing Cloudinary Images */}
                                                    {boardingExistingImages.map((src, index) => (
                                                        <div key={`existing-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group">
                                                            <img src={src} alt="existing" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => setBoardingExistingImages(prev => prev.filter((_, i) => i !== index))}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {/* Newly Added Local Images */}
                                                    {boardingPreviews.map((src, index) => (
                                                        <div key={`new-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                                                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => handleImageDelete(index, setBoardingImages, setBoardingPreviews)}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-all active:scale-[0.98] shadow-lg shadow-green-600/10 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : editingId ? (
                                                <>
                                                    <Check size={18} />
                                                    Save Boarding Changes
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} />
                                                    Publish Accommodation
                                                </>
                                            )}
                                        </button>

                                        {editingId && (
                                            <button
                                                type="button"
                                                disabled={uploading}
                                                onClick={handleCancelEdit}
                                                className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 transition-all cursor-pointer text-center disabled:opacity-50"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: Grid List */}
                            <div className="xl:col-span-7 space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800">Your Active Accommodations ({listings.boarding.length})</h3>

                                {loadingListings ? (
                                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/60">
                                        <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-slate-400 mt-3 font-medium">Fetching listings...</p>
                                    </div>
                                ) : listings.boarding.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-200/60 p-6 text-center">
                                        <div className="p-4 bg-green-50 text-green-500 rounded-full mb-4">
                                            <Home size={32} />
                                        </div>
                                        <p className="text-slate-700 font-semibold">No accommodations published yet</p>
                                        <p className="text-slate-400 text-xs mt-1 max-w-sm">Use the form on the left to list boarding rooms near {profile?.university || "the university"}.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {listings.boarding.map((item) => (
                                            <div key={item.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between group transition-all ${
                                                editingId === item.id ? "border-green-600 ring-2 ring-green-600/10" : "border-slate-200/80 hover:border-green-400"
                                            }`}>
                                                
                                                {/* Listing Card Header Image cover */}
                                                <div className="relative h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                                                    {item.images && item.images.length > 0 ? (
                                                        <>
                                                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                                                            {item.images.length > 1 && (
                                                                <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white font-bold text-[10px] rounded-full backdrop-blur-sm tracking-wider">
                                                                    +{item.images.length - 1} PHOTOS
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Home size={36} className="text-slate-300" />
                                                    )}
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-green-700 transition-all">{item.title}</h4>
                                                        
                                                        {/* Action Buttons: EDIT & DELETE */}
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                disabled={uploading}
                                                                onClick={() => handleStartEdit(item, "boarding")}
                                                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                title="Edit Listing"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteListing("uni_boardings", item.id, "boarding")}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                title="Delete Listing"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-700 rounded-md uppercase tracking-wider">{item.roomType}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md uppercase tracking-wider">Pref: {item.gender}</span>
                                                    </div>

                                                    <div className="space-y-1.5 text-xs text-slate-500">
                                                        <p className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400 flex-shrink-0" /> {item.address}</p>
                                                        <p className="line-clamp-2 italic">"{item.description}"</p>
                                                    </div>

                                                    {item.amenities?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 pt-1">
                                                            {item.amenities.map(amenity => (
                                                                <span key={amenity} className="text-[9px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{formatAmenity(amenity)}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Monthly Rent</span>
                                                        <span className="font-bold text-slate-800 text-sm">LKR {item.rent.toLocaleString()}</span>
                                                    </div>
                                                    {item.deposit > 0 && (
                                                        <div className="text-right">
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Deposit</span>
                                                            <span className="font-semibold text-slate-600 text-xs">LKR {item.deposit.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* FOODS VIEW */}
                    {activeTab === "foods" && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fadeIn">
                            
                            {/* Left Column: Form */}
                            <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                                        <Utensils size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {editingId ? "Edit Menu Item" : "Add Menu Item"}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {editingId ? "Modify this active meal item's details" : "List meals or snacks for campus delivery"}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleFoodsSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meal / Dish Name *</label>
                                        <input 
                                            type="text"
                                            required
                                            disabled={uploading}
                                            value={foodsForm.name}
                                            onChange={e => setFoodsForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Traditional Chicken Rice & Curry"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Price (LKR) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min="0"
                                                disabled={uploading}
                                                value={foodsForm.price}
                                                onChange={e => setFoodsForm(prev => ({ ...prev, price: e.target.value }))}
                                                placeholder="e.g. 450"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Daily Limit (Parcels) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min="1"
                                                disabled={uploading}
                                                value={foodsForm.availableParcels}
                                                onChange={e => setFoodsForm(prev => ({ ...prev, availableParcels: e.target.value }))}
                                                placeholder="e.g. 20"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category *</label>
                                            <select 
                                                value={foodsForm.category}
                                                disabled={uploading}
                                                onChange={e => setFoodsForm(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="Breakfast">Breakfast</option>
                                                <option value="Lunch">Lunch</option>
                                                <option value="Dinner">Dinner</option>
                                                <option value="Beverages">Beverages</option>
                                                <option value="Snacks">Snacks</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meal Type *</label>
                                            <select 
                                                value={foodsForm.mealType}
                                                disabled={uploading}
                                                onChange={e => setFoodsForm(prev => ({ ...prev, mealType: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="veg">Vegetarian</option>
                                                <option value="non-veg">Non-Vegetarian</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Included Curries / Items (comma separated) *</label>
                                        <input 
                                            type="text"
                                            required
                                            disabled={uploading}
                                            value={foodsForm.includedItems}
                                            onChange={e => setFoodsForm(prev => ({ ...prev, includedItems: e.target.value }))}
                                            placeholder="e.g. Soya meat, Murunga, Chicken curry, Dhal"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Meal Description / Ingredients *</label>
                                        <textarea 
                                            required
                                            rows="3"
                                            disabled={uploading}
                                            value={foodsForm.description}
                                            onChange={e => setFoodsForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Describe the meal, specify spice levels, or list allergens..."
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                                        />
                                    </div>

                                    {/* FOODS PHOTO UPLOADER */}
                                    <div className="space-y-3 pt-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Meal Photos</label>
                                        <div className="flex flex-col gap-3">
                                            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/20 py-3 rounded-xl cursor-pointer transition-all">
                                                <Camera size={18} className="text-slate-400" />
                                                <span className="text-xs text-slate-600 font-semibold">Select Photos (Multiple)</span>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    disabled={uploading}
                                                    className="hidden" 
                                                    onChange={e => handleImageChange(e, setFoodsImages, setFoodsPreviews)} 
                                                />
                                            </label>

                                            {(foodsExistingImages.length > 0 || foodsPreviews.length > 0) && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {foodsExistingImages.map((src, index) => (
                                                        <div key={`existing-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group">
                                                            <img src={src} alt="existing" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => setFoodsExistingImages(prev => prev.filter((_, i) => i !== index))}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {foodsPreviews.map((src, index) => (
                                                        <div key={`new-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                                                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => handleImageDelete(index, setFoodsImages, setFoodsPreviews)}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all active:scale-[0.98] shadow-lg shadow-amber-500/10 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : editingId ? (
                                                <>
                                                    <Check size={18} />
                                                    Save Meal Changes
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} />
                                                    Publish Meal Item
                                                </>
                                            )}
                                        </button>

                                        {editingId && (
                                            <button
                                                type="button"
                                                disabled={uploading}
                                                onClick={handleCancelEdit}
                                                className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 transition-all cursor-pointer text-center disabled:opacity-50"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: Grid List */}
                            <div className="xl:col-span-7 space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800">Your Active Food Items ({listings.foods.length})</h3>

                                {loadingListings ? (
                                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/60">
                                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-slate-400 mt-3 font-medium">Fetching food items...</p>
                                    </div>
                                ) : listings.foods.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-200/60 p-6 text-center">
                                        <div className="p-4 bg-amber-50 text-amber-500 rounded-full mb-4">
                                            <Utensils size={32} />
                                        </div>
                                        <p className="text-slate-700 font-semibold">No food listings published yet</p>
                                        <p className="text-slate-400 text-xs mt-1 max-w-sm">Use the form on the left to add active dishes or catering menus for student order processing.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {listings.foods.map((item) => (
                                            <div key={item.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between group transition-all ${
                                                editingId === item.id ? "border-amber-500 ring-2 ring-amber-500/10" : "border-slate-200/80 hover:border-amber-400"
                                            }`}>
                                                
                                                {/* Meal Card Cover */}
                                                <div className="relative h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                                                    {item.images && item.images.length > 0 ? (
                                                        <>
                                                            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                                                            {item.images.length > 1 && (
                                                                <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white font-bold text-[10px] rounded-full backdrop-blur-sm tracking-wider">
                                                                    +{item.images.length - 1} PHOTOS
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Utensils size={36} className="text-slate-300" />
                                                    )}
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-amber-700 transition-all">{item.name}</h4>
                                                        
                                                        {/* Action Buttons: EDIT & DELETE */}
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                disabled={uploading}
                                                                onClick={() => handleStartEdit(item, "foods")}
                                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                title="Edit Listing"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteListing("uni_foods", item.id, "foods")}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                title="Delete Listing"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md uppercase tracking-wider">{item.category}</span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                                            item.mealType === 'veg' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                                        }`}>
                                                            {item.mealType === 'veg' ? 'Veg' : 'Non-Veg'}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                                                         {item.availableParcels !== undefined && (
                                                             <p className="flex items-center gap-1.5 text-slate-600"><Box size={14} className="text-slate-400 flex-shrink-0" /> Daily Limit: {item.availableParcels} parcels</p>
                                                         )}

                                                         {item.includedItems?.length > 0 && (
                                                             <div className="flex flex-wrap gap-1.5 pt-1">
                                                                 {item.includedItems.map((inc, i) => (
                                                                     <span key={i} className="text-[9px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">{inc}</span>
                                                                 ))}
                                                             </div>
                                                         )}
                                                         <p className="line-clamp-2 italic">"{item.description}"</p>
                                                     </div>
                                                </div>

                                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Meal Price</span>
                                                        <span className="font-bold text-slate-800 text-sm">LKR {item.price.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STORE VIEW */}
                    {activeTab === "store" && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fadeIn">
                            
                            {/* Left Column: Form */}
                            <div className="xl:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">
                                            {editingId ? "Edit Store Product" : "Add Store Product"}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {editingId ? "Modify this active product's specifications" : "List essential study materials or dorm items"}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleStoreSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Name *</label>
                                        <input 
                                            type="text"
                                            required
                                            disabled={uploading}
                                            value={storeForm.name}
                                            onChange={e => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Casio fx-991EX Scientific Calculator"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Price (LKR) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min="0"
                                                disabled={uploading}
                                                value={storeForm.price}
                                                onChange={e => setStoreForm(prev => ({ ...prev, price: e.target.value }))}
                                                placeholder="e.g. 6800"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Available Stock *</label>
                                            <input 
                                                type="number"
                                                required
                                                min="1"
                                                disabled={uploading}
                                                value={storeForm.stock}
                                                onChange={e => setStoreForm(prev => ({ ...prev, stock: e.target.value }))}
                                                placeholder="e.g. 5"
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category *</label>
                                            <select 
                                                value={storeForm.category}
                                                disabled={uploading}
                                                onChange={e => setStoreForm(prev => ({ ...prev, category: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="Stationery">Stationery</option>
                                                <option value="Electronics">Electronics</option>
                                                <option value="Books">Books</option>
                                                <option value="Clothing">Clothing</option>
                                                <option value="Dorm Essentials">Dorm Essentials</option>
                                                <option value="Others">Others</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Condition *</label>
                                            <select 
                                                value={storeForm.condition}
                                                disabled={uploading}
                                                onChange={e => setStoreForm(prev => ({ ...prev, condition: e.target.value }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white disabled:opacity-50"
                                            >
                                                <option value="new">Brand New</option>
                                                <option value="like_new">Like New</option>
                                                <option value="used">Used / Fair</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Description *</label>
                                        <textarea 
                                            required
                                            rows="3"
                                            disabled={uploading}
                                            value={storeForm.description}
                                            onChange={e => setStoreForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Detail what is included, warranty specs, or university batch course relevance..."
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
                                        />
                                    </div>

                                    {/* STORE PHOTO UPLOADER */}
                                    <div className="space-y-3 pt-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Photos</label>
                                        <div className="flex flex-col gap-3">
                                            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 py-3 rounded-xl cursor-pointer transition-all">
                                                <Camera size={18} className="text-slate-400" />
                                                <span className="text-xs text-slate-600 font-semibold">Select Photos (Multiple)</span>
                                                <input 
                                                    type="file" 
                                                    multiple 
                                                    accept="image/*" 
                                                    disabled={uploading}
                                                    className="hidden" 
                                                    onChange={e => handleImageChange(e, setStoreImages, setStorePreviews)} 
                                                />
                                            </label>

                                            {(storeExistingImages.length > 0 || storePreviews.length > 0) && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {storeExistingImages.map((src, index) => (
                                                        <div key={`existing-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group">
                                                            <img src={src} alt="existing" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => setStoreExistingImages(prev => prev.filter((_, i) => i !== index))}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {storePreviews.map((src, index) => (
                                                        <div key={`new-${index}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                                                            <img src={src} alt="preview" className="w-full h-full object-cover" />
                                                            <button 
                                                                type="button"
                                                                disabled={uploading}
                                                                onClick={() => handleImageDelete(index, setStoreImages, setStorePreviews)}
                                                                className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-90 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/10 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                                        >
                                            {uploading ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    Processing...
                                                </>
                                            ) : editingId ? (
                                                <>
                                                    <Check size={18} />
                                                    Save Product Changes
                                                </>
                                            ) : (
                                                <>
                                                    <Plus size={18} />
                                                    Publish Store Item
                                                </>
                                            )}
                                        </button>

                                        {editingId && (
                                            <button
                                                type="button"
                                                disabled={uploading}
                                                onClick={handleCancelEdit}
                                                className="w-full py-2 px-4 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-500 transition-all cursor-pointer text-center disabled:opacity-50"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: Grid List */}
                            <div className="xl:col-span-7 space-y-4">
                                <h3 className="text-lg font-semibold text-slate-800">Your Active Products ({listings.store.length})</h3>

                                {loadingListings ? (
                                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/60">
                                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-slate-400 mt-3 font-medium">Fetching product inventory...</p>
                                    </div>
                                ) : listings.store.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-slate-200/60 p-6 text-center">
                                        <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full mb-4">
                                            <ShoppingBag size={32} />
                                        </div>
                                        <p className="text-slate-700 font-semibold">No store products published yet</p>
                                        <p className="text-slate-400 text-xs mt-1 max-w-sm">Use the form on the left to add items to your online store and manage student orders.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {listings.store.map((item) => (
                                            <div key={item.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between group transition-all ${
                                                editingId === item.id ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-200/80 hover:border-indigo-400"
                                            }`}>
                                                
                                                {/* Product Card Cover */}
                                                <div className="relative h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                                                    {item.images && item.images.length > 0 ? (
                                                        <>
                                                            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                                                            {item.images.length > 1 && (
                                                                <span className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white font-bold text-[10px] rounded-full backdrop-blur-sm tracking-wider">
                                                                    +{item.images.length - 1} PHOTOS
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <ShoppingBag size={36} className="text-slate-300" />
                                                    )}
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 group-hover:text-indigo-700 transition-all">{item.name}</h4>
                                                        
                                                        {/* Action Buttons: EDIT & DELETE */}
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                disabled={uploading}
                                                                onClick={() => handleStartEdit(item, "store")}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                                                title="Edit Listing"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteListing("uni_stores", item.id, "store")}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                                                title="Delete Listing"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md uppercase tracking-wider">{item.category}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md uppercase tracking-wider">Cond: {item.condition.replace("_", " ")}</span>
                                                    </div>

                                                    <div className="space-y-1.5 text-xs text-slate-500">
                                                        <p className="flex items-center gap-1.5"><Box size={14} className="text-slate-400 flex-shrink-0" /> Stock Level: {item.stock} unit(s)</p>
                                                        <p className="line-clamp-2 italic">"{item.description}"</p>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Retail Price</span>
                                                        <span className="font-bold text-slate-800 text-sm">LKR {item.price.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* REQUESTED BOARDINGS VIEW */}
                    {activeTab === "requestedBoardings" && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Home size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">Requested Boarding Bookings</h2>
                                        <p className="text-xs text-slate-400">Inquiries and booking requests for your accommodations</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchBoardingRequests}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                                >
                                    Refresh Requests
                                </button>
                            </div>

                            {loadingRequests ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-slate-400 mt-3 font-medium">Loading booking requests...</p>
                                </div>
                            ) : boardingRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 p-6 text-center">
                                    <div className="p-4 bg-green-50/50 text-green-500 rounded-full mb-4">
                                        <Calendar size={32} />
                                    </div>
                                    <p className="text-slate-700 font-semibold">No booking requests found</p>
                                    <p className="text-slate-400 text-xs mt-1 max-w-sm">When students request a booking on your boarding rooms, they will show up here.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                                <th className="pb-3 pr-4">Property Title</th>
                                                <th className="pb-3 pr-4">Student Details</th>
                                                <th className="pb-3 pr-4">Requirements / Note</th>
                                                <th className="pb-3 pr-4">Date Requested</th>
                                                <th className="pb-3 pr-4">Status</th>
                                                <th className="pb-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-600">
                                            {boardingRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-slate-50/40 transition-all">
                                                    <td className="py-4 pr-4 font-semibold text-slate-800 align-top max-w-[200px] truncate" title={req.boardingTitle}>
                                                        {req.boardingTitle}
                                                    </td>
                                                    <td className="py-4 pr-4 align-top space-y-1">
                                                        <div className="font-bold text-slate-700 flex items-center gap-1">
                                                            <User className="text-green-600 w-4 h-4 flex-shrink-0" />
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
                                                        {req.studentRequirements ? `"${req.studentRequirements}"` : "No special notes provided."}
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

                    {/* PRIVACY-PRESERVING FOOD ORDERS VIEW */}
                    {activeTab === "requestedFoods" && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                        <Utensils size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-800">Your Meal Preparation Orders</h2>
                                        <p className="text-xs text-slate-400">Preparation quantities and logs. Customer delivery details are managed securely by administrators.</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={fetchFoodOrders}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                                >
                                    Refresh Orders
                                </button>
                            </div>

                            {loadingFoodOrders ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-sm text-slate-400 mt-3 font-medium">Loading preparation list...</p>
                                </div>
                            ) : foodOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-80 p-6 text-center">
                                    <div className="p-4 bg-green-50/50 text-green-500 rounded-full mb-4">
                                        <Utensils size={32} />
                                    </div>
                                    <p className="text-slate-700 font-semibold">No food orders placed yet</p>
                                    <p className="text-slate-400 text-xs mt-1 max-w-sm">When students place daily meal orders, you will see preparation counts here.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Aggregated Preparation Counts Grid */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Prep Queue</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {Object.entries(
                                                foodOrders.reduce((acc, order) => {
                                                    acc[order.foodName] = (acc[order.foodName] || 0) + order.quantity
                                                    return acc
                                                }, {})
                                            ).map(([mealName, totalQty]) => (
                                                <div key={mealName} className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                                                    <div className="space-y-0.5">
                                                        <span className="font-bold text-slate-800 text-sm block truncate max-w-[150px]" title={mealName}>{mealName}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">To Prepare</span>
                                                    </div>
                                                    <span className="bg-green-600 text-white font-extrabold text-base px-3.5 py-1.5 rounded-xl">
                                                        {totalQty} {totalQty === 1 ? "Unit" : "Units"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Order Log Table */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order Preparation Logs</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-widest text-[10px] font-bold">
                                                        <th className="pb-3 pr-4">Meal Item</th>
                                                        <th className="pb-3 pr-4">Category & Type</th>
                                                        <th className="pb-3 pr-4">Quantity Ordered</th>
                                                        <th className="pb-3 pr-4">Order Date / Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                                    {foodOrders.map((order) => (
                                                        <tr key={order.id} className="hover:bg-slate-50/40 transition-all">
                                                            <td className="py-4 pr-4 font-bold text-slate-800 align-top">
                                                                {order.foodName}
                                                            </td>
                                                            <td className="py-4 pr-4 align-top capitalize text-xs">
                                                                {order.category} | {order.mealType === "veg" ? "Pure Veg" : "Non-Veg"}
                                                            </td>
                                                            <td className="py-4 pr-4 align-top font-bold text-green-700">
                                                                {order.quantity} {order.quantity === 1 ? "parcel" : "parcels"}
                                                            </td>
                                                            <td className="py-4 pr-4 align-top text-xs text-slate-400">
                                                                {new Date(order.createdAt).toLocaleDateString(undefined, { 
                                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </ProtectedRoute>
    )
}
