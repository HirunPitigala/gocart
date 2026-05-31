import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { decryptPassword } from "@/lib/crypto";

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, message: "Missing email or verification code." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Fetch pending registration document
        const pendingDocRef = doc(db, "pendingRegistrations", normalizedEmail);
        const pendingDocSnap = await getDoc(pendingDocRef);

        if (!pendingDocSnap.exists()) {
            return NextResponse.json(
                { success: false, message: "No registration request found. Please fill the sign-up form again." },
                { status: 404 }
            );
        }

        const pendingData = pendingDocSnap.data();

        // 2. Check expiration (10 minutes)
        if (new Date() > new Date(pendingData.expiresAt)) {
            return NextResponse.json(
                { success: false, message: "Verification code has expired. Please register or resend code." },
                { status: 400 }
            );
        }

        // 3. Verify OTP
        if (pendingData.otp !== otp.trim()) {
            return NextResponse.json(
                { success: false, message: "Invalid verification code. Please check your email and try again." },
                { status: 400 }
            );
        }

        // 4. Decrypt password
        const decryptedPass = decryptPassword(pendingData.password);

        // 5. Create user in Firebase Auth
        let userCredential;
        try {
            userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, decryptedPass);
        } catch (authError) {
            console.error("Firebase auth creation error:", authError);
            if (authError.code === "auth/email-already-in-use") {
                return NextResponse.json(
                    { success: false, message: "Email is already registered in our system." },
                    { status: 400 }
                );
            }
            return NextResponse.json(
                { success: false, message: "Authentication setup failed: " + authError.message },
                { status: 500 }
            );
        }

        const uid = userCredential.user.uid;

        // 6. Create permanent profile document in Firestore
        if (pendingData.role === "customer") {
            await setDoc(doc(db, "users", uid), {
                uid,
                role: "customer",
                fullName: pendingData.fullName,
                email: normalizedEmail,
                phone: pendingData.phone,
                university: pendingData.university,
                createdAt: new Date().toISOString()
            });
        } else {
            await setDoc(doc(db, "serviceProviders", uid), {
                uid,
                role: "service_provider",
                providerName: pendingData.providerName,
                email: normalizedEmail,
                phone: pendingData.phone,
                university: pendingData.university,
                services: pendingData.services,
                createdAt: new Date().toISOString()
            });
        }

        // 7. Delete the pending registration document
        await deleteDoc(pendingDocRef);

        return NextResponse.json({
            success: true,
            message: "Account verified and registered successfully!"
        });

    } catch (err) {
        console.error("Error in verify-otp API route:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error: " + err.message },
            { status: 500 }
        );
    }
}
