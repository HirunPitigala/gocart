import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { encryptPassword } from "@/lib/crypto";
import nodemailer from "nodemailer";

export async function POST(request) {
    try {
        const body = await request.json();
        const { role, email, phone, university, password, fullName, providerName, services } = body;

        // 1. Common validations
        if (!email || !phone || !university || !password) {
            return NextResponse.json(
                { success: false, message: "Missing required fields." },
                { status: 400 }
            );
        }

        if (role === "customer" && !fullName) {
            return NextResponse.json(
                { success: false, message: "Please enter your Full Name." },
                { status: 400 }
            );
        }

        if (role === "provider" && !providerName) {
            return NextResponse.json(
                { success: false, message: "Please enter your Business/Provider Name." },
                { status: 400 }
            );
        }

        // Email format validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
            return NextResponse.json(
                { success: false, message: "Please enter a valid email address." },
                { status: 400 }
            );
        }

        // Sri Lankan phone number validation
        const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
        const slPhoneRegex = /^(?:\+94|94|0)?7[0-9]{8}$/;
        if (!slPhoneRegex.test(cleanPhone)) {
            return NextResponse.json(
                { success: false, message: "Please enter a valid Sri Lankan mobile number." },
                { status: 400 }
            );
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>_\-+=\[\]]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return NextResponse.json(
                { success: false, message: "Password is not strong enough." },
                { status: 400 }
            );
        }

        // Service provider validation
        if (role === "provider" && (!services || services.length === 0)) {
            return NextResponse.json(
                { success: false, message: "Please select at least one service you provide." },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Prevent duplicate account creation: check if email is already in use
        const customerQuery = query(collection(db, "users"), where("email", "==", normalizedEmail));
        const customerSnap = await getDocs(customerQuery);
        if (!customerSnap.empty) {
            return NextResponse.json(
                { success: false, message: "Email is already registered." },
                { status: 400 }
            );
        }

        const providerQuery = query(collection(db, "serviceProviders"), where("email", "==", normalizedEmail));
        const providerSnap = await getDocs(providerQuery);
        if (!providerSnap.empty) {
            return NextResponse.json(
                { success: false, message: "Email is already registered." },
                { status: 400 }
            );
        }

        // 3. Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes expiration

        // 4. Store details securely with encrypted password
        const encryptedPass = encryptPassword(password);
        await setDoc(doc(db, "pendingRegistrations", normalizedEmail), {
            email: normalizedEmail,
            role,
            fullName: role === "customer" ? fullName : "",
            providerName: role === "provider" ? providerName : "",
            phone: cleanPhone,
            university,
            services: role === "provider" ? services : [],
            password: encryptedPass,
            otp,
            expiresAt,
            createdAt: new Date().toISOString()
        });

        // 5. Send professional OTP verification email
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"UniLink" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "Verify Your Email Address",
            html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 15px; margin: 0;">
                <div style="max-width: 500px; background-color: #ffffff; border-radius: 16px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden;">
                    <div style="background-color: #16a34a; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">UniLink</h1>
                    </div>
                    <div style="padding: 40px 30px; text-align: center;">
                        <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Verify Your Email Address</h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                            Thank you for starting your registration with UniLink! Please use the following 6-digit verification code (OTP) to complete your signup process.
                        </p>
                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 0 auto 30px auto; width: fit-content;">
                            <span style="font-size: 32px; font-weight: 700; color: #15803d; letter-spacing: 6px; display: inline-block; padding-left: 6px;">${otp}</span>
                        </div>
                        <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin: 0 0 20px 0;">
                            ⏰ This verification code is valid for exactly 10 minutes.
                        </p>
                        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                            If you didn't request this email, please ignore it or contact our support team.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} UniLink. All rights reserved.</p>
                    </div>
                </div>
            </div>
            `
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: "OTP sent successfully."
        });

    } catch (err) {
        console.error("Error in send-otp API route:", err);
        return NextResponse.json(
            { success: false, message: "Internal server error: " + err.message },
            { status: 500 }
        );
    }
}
