import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { encryptPassword } from "@/lib/crypto";

export async function POST(request) {
    try {
        const { fullName, email, tempPassword } = await request.json();

        if (!fullName || !email || !tempPassword) {
            return NextResponse.json(
                { success: false, message: "Missing required fields: fullName, email, tempPassword" },
                { status: 400 }
            );
        }

        const emailKey = email.toLowerCase().trim();

        // Encrypt the temporary password before saving to the database
        const encryptedPassword = encryptPassword(tempPassword);

        // Save admin seeder document in Firestore users/email with the encrypted password
        await setDoc(doc(db, "users", emailKey), {
            fullName: fullName,
            email: emailKey,
            role: "admin",
            tempPassword: encryptedPassword,
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: `Admin setup for ${fullName} created successfully with encrypted credentials.`
        });

    } catch (err) {
        console.error("Error in add-admin API route:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error: " + err.message },
            { status: 500 }
        );
    }
}
