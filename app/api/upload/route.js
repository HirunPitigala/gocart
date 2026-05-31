import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary credentials from environment variables securely on the server
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
    try {
        const formData = await request.formData();
        const files = formData.getAll("files");

        if (!files || files.length === 0) {
            return NextResponse.json(
                { success: false, message: "No files selected for upload." },
                { status: 400 }
            );
        }

        // Upload all selected files concurrently
        const uploadPromises = files.map(async (file) => {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: "unilink" },
                    (error, result) => {
                        if (error) {
                            console.error("Cloudinary upload error details:", error);
                            reject(error);
                        } else {
                            resolve(result.secure_url);
                        }
                    }
                ).end(buffer);
            });
        });

        const urls = await Promise.all(uploadPromises);

        return NextResponse.json({
            success: true,
            urls
        });

    } catch (error) {
        console.error("Error in Cloudinary upload API route:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error during upload: " + error.message },
            { status: 500 }
        );
    }
}
