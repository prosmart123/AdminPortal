import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration from environment variables
const DEST_CREDS = {
    "cloud_name": process.env.CLOUDINARY_CLOUD_NAME || "",
    "api_key": process.env.CLOUDINARY_API_KEY || "",
    "api_secret": process.env.CLOUDINARY_API_SECRET || "",
};

cloudinary.config({
    cloud_name: DEST_CREDS.cloud_name,
    api_key: DEST_CREDS.api_key,
    api_secret: DEST_CREDS.api_secret,
});

export async function GET(request: NextRequest) {
    try {
        // Test Cloudinary connection by fetching account details
        const result = await cloudinary.api.ping();

        return NextResponse.json({
            success: true,
            message: 'Cloudinary connection successful',
            config: {
                cloud_name: DEST_CREDS.cloud_name,
                api_key: DEST_CREDS.api_key.substring(0, 4) + '...',
            },
            ping: result
        });
    } catch (error: any) {
        console.error('Cloudinary test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to connect to Cloudinary',
            config: {
                cloud_name: DEST_CREDS.cloud_name,
                api_key: DEST_CREDS.api_key.substring(0, 4) + '...',
            }
        }, { status: 500 });
    }
}
