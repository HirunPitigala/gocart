'use client'
import { Suspense, useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"
import { Search, MapPin, GraduationCap, ChevronRight, Home, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

function BoardingCard({ boarding }) {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'LKR'
    const coverImage = boarding.images && boarding.images.length > 0 ? boarding.images[0] : null

    return (
        <Link href={`/boarding/${boarding.id}`} className="group max-xl:mx-auto flex flex-col cursor-pointer">
            {/* Visual Container matching ProductCard */}
            <div className="bg-[#F5F5F5] h-48 w-full sm:w-60 sm:h-68 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 relative">
                {coverImage ? (
                    <img 
                        src={coverImage} 
                        alt={boarding.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300" 
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <Home size={32} />
                        <span className="text-[10px] uppercase font-semibold mt-1 tracking-wider text-slate-400">No Photo</span>
                    </div>
                )}
                
                {/* Float gender preference badge */}
                <span className="absolute top-3 left-3 text-[9px] font-bold px-2 py-0.5 bg-white/90 text-slate-700 rounded-full shadow-sm backdrop-blur-xs tracking-wider capitalize">
                    {boarding.gender === "any" ? "Any Gender" : boarding.gender}
                </span>

                {/* Float room type badge */}
                <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 bg-green-600/90 text-white rounded-full shadow-sm backdrop-blur-xs tracking-wider capitalize">
                    {boarding.roomType}
                </span>
            </div>

            {/* Text details matching ProductCard format */}
            <div className="flex justify-between gap-3 text-sm pt-3.5 max-w-60">
                <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate leading-snug group-hover:text-green-600 transition-all">{boarding.title}</h3>
                    <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
                        <GraduationCap size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{boarding.university}</span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <span className="font-bold text-slate-800 text-sm block">{currency} {boarding.rent.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400 block -mt-0.5">/ month</span>
                </div>
            </div>
        </Link>
    )
}

function BoardingShopContent() {
    const router = useRouter()
    const [boardings, setBoardings] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const loadBoardings = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "uni_boardings"))
                const items = []
                querySnapshot.forEach(docSnap => {
                    items.push({ id: docSnap.id, ...docSnap.data() })
                })
                setBoardings(items)
            } catch (error) {
                console.error("Error loading boardings:", error)
            } finally {
                setLoading(false)
            }
        }
        loadBoardings()
        window.scrollTo(0, 0)
    }, [])

    const filteredBoardings = boardings.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-[75vh] mx-6">
            <div className="max-w-7xl mx-auto py-8">
                
                {/* Search Bar / Title Header strip */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-100 pb-6">
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">
                            Uni-<span className="text-green-600 font-light">Boarding</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">Discover premium, student-vetted accommodations near your university</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 px-4 py-3 rounded-full text-sm w-full md:max-w-md shadow-inner border border-slate-200/50">
                        <Search size={18} className="text-slate-500 flex-shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search by title, university, or location..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none w-full text-slate-700 placeholder-slate-500" 
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-80">
                        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-semibold text-slate-400 mt-4 animate-pulse">Scanning accommodations...</p>
                    </div>
                ) : filteredBoardings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-slate-200/60 p-8 text-center shadow-xs">
                        <div className="p-4 bg-green-50 text-green-500 rounded-full mb-4">
                            <Home size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">No accommodations found</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-md">No listings matched your search criteria or are published yet. Try modifying your search or check back later.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 mb-32 animate-fadeIn">
                        {filteredBoardings.map(boarding => (
                            <BoardingCard key={boarding.id} boarding={boarding} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function BoardingPage() {
    return (
        <Suspense fallback={<div>Loading Uni-Boarding portal...</div>}>
            <BoardingShopContent />
        </Suspense>
    )
}
