import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { decryptPassword } from "@/lib/crypto";

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        const superAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const superAdminPassword = process.env.ADMIN_PASSWORD;

        if (!superAdminEmail || !superAdminPassword) {
            return NextResponse.json(
                { success: false, message: "Super Admin credentials are not configured in server .env" },
                { status: 500 }
            );
        }

        // 1. Authenticate Super Admin
        if (email === superAdminEmail) {
            if (password !== superAdminPassword) {
                return NextResponse.json(
                    { success: false, message: "Invalid administrator credentials" },
                    { status: 401 }
                );
            }

            // Sync with Firebase Auth
            let userCredential = null;
            try {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } catch (authError) {
                if (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential") {
                    try {
                        userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    } catch (createError) {
                        return NextResponse.json(
                            { success: false, message: "Could not seed Super Admin: " + createError.message },
                            { status: 500 }
                        );
                    }
                } else {
                    return NextResponse.json(
                        { success: false, message: "Auth verification failed: " + authError.message },
                        { status: 500 }
                    );
                }
            }

            const uid = userCredential.user.uid;
            // Write document to Firestore under doc users/uid
            await setDoc(doc(db, "users", uid), {
                uid: uid,
                role: "admin",
                fullName: "Super Admin",
                email: email,
                createdAt: new Date().toISOString()
            }, { merge: true });

            return NextResponse.json({ success: true, role: "admin" });
        }

        // 2. Authenticate Additional Admins added by other admins
        // First check if there is a temp/unseeded document under users/email
        const tempDocRef = doc(db, "users", email.toLowerCase());
        const tempDocSnap = await getDoc(tempDocRef);

        if (tempDocSnap.exists()) {
            const tempAdminData = tempDocSnap.data();
            const decryptedTempPassword = decryptPassword(tempAdminData.tempPassword);
            if (tempAdminData.role === "admin" && decryptedTempPassword === password) {
                try {
                    // Seed the Auth user programmatically
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const uid = userCredential.user.uid;

                    // Save the real document under the real UID (no tempPassword stored for security)
                    await setDoc(doc(db, "users", uid), {
                        uid: uid,
                        role: "admin",
                        fullName: tempAdminData.fullName,
                        email: email,
                        createdAt: tempAdminData.createdAt || new Date().toISOString()
                    });

                    // Remove the temporary setup document
                    await deleteDoc(tempDocRef);

                    return NextResponse.json({
                        success: true,
                        role: "admin",
                        message: "Additional admin seeded successfully"
                    });
                } catch (createError) {
                    console.error("Failed to seed additional admin:", createError);
                    return NextResponse.json(
                        { success: false, message: "Failed to seed additional admin account: " + createError.message },
                        { status: 500 }
                    );
                }
            }
        }

        // 3. Fallback check for already seeded additional admins in Firestore
        const q = query(collection(db, "users"), where("email", "==", email), where("role", "==", "admin"));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return NextResponse.json({
                success: true,
                role: "admin",
                alreadySeeded: true
            });
        }

        // Not an admin email
        return NextResponse.json(
            { success: false, isNotAdmin: true, message: "Not an authorized administrator" },
            { status: 404 }
        );

    } catch (err) {
        console.error("Admin verification exception:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error: " + err.message },
            { status: 500 }
        );
    }
}
