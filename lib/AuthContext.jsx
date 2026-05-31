'use client'
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext({
    user: null,
    role: null,
    profile: null,
    loading: true,
    logout: async () => {},
    refreshProfile: async () => {}
});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (firebaseUser) => {
        if (!firebaseUser) {
            setRole(null);
            setProfile(null);
            return;
        }

        try {
            // 1. Try checking the "users" collection (for customers and admins)
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setRole(data.role);
                setProfile(data);
                return;
            }

            // 2. Try checking the "serviceProviders" collection (for service providers)
            const providerDocRef = doc(db, "serviceProviders", firebaseUser.uid);
            const providerDocSnap = await getDoc(providerDocRef);

            if (providerDocSnap.exists()) {
                const data = providerDocSnap.data();
                setRole(data.role || "service_provider");
                setProfile(data);
                return;
            }

            // 3. Fallback if user is authenticated in Firebase Auth but no profile document exists yet
            setRole(null);
            setProfile(null);
        } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            setRole(null);
            setProfile(null);
        }
    };

    const refreshProfile = async () => {
        if (auth.currentUser) {
            await fetchUserProfile(auth.currentUser);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            if (firebaseUser) {
                setUser(firebaseUser);
                await fetchUserProfile(firebaseUser);
            } else {
                setUser(null);
                setRole(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
            setUser(null);
            setRole(null);
            setProfile(null);
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, profile, loading, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
