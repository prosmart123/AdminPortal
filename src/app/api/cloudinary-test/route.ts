import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary configuration
const DEST_CREDS = {
    "cloud_name": "dstmt1w5p",
    "api_key": "747859347794899",
    "api_secret": "O04mjGTySv_xuuXHWQ6hR6uuHcM",
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
