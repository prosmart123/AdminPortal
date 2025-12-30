import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB configuration
const username = encodeURIComponent("kunal");
const password = encodeURIComponent("kunal");
const mongo_uri = `mongodb+srv://${username}:${password}@cluster0.9k8qle5.mongodb.net/?appName=Cluster0`;

let client: MongoClient | null = null;

async function getDatabase() {
    if (!client) {
        client = new MongoClient(mongo_uri);
        await client.connect();
    }
    return client.db('prosmart_db');
}

async function getHydraliteDatabase() {
    if (!client) {
        client = new MongoClient(mongo_uri);
        await client.connect();
    }
    return client.db('hydralite');
}

export async function GET(request: NextRequest) {
    try {
        const db = await getHydraliteDatabase();
        const collection = db.collection('productsPriority');

        // Get the priority document
        const priority = await collection.findOne({});

        // If no document exists, return empty products array
        const products = priority?.products || [];

        return NextResponse.json({
            success: true,
            data: {
                products
            }
        });

    } catch (error) {
        console.error('Error fetching products priority:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch products priority' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { products } = body;

        // Validate input
        if (!Array.isArray(products)) {
            return NextResponse.json(
                { success: false, error: 'Products must be an array' },
                { status: 400 }
            );
        }

        const db = await getHydraliteDatabase();
        const priorityCollection = db.collection('productsPriority');
        const productsCollection = db.collection('products');

        // Validate that all product IDs exist
        for (const productId of products) {
            if (productId) {
                const product = await productsCollection.findOne({ _id: new ObjectId(productId) });
                if (!product) {
                    return NextResponse.json(
                        { success: false, error: `Product with ID ${productId} not found` },
                        { status: 404 }
                    );
                }
            }
        }

        // Update or create the priority document
        await priorityCollection.updateOne(
            {},
            { $set: { products, updated_at: new Date().toISOString() } },
            { upsert: true }
        );

        return NextResponse.json({
            success: true,
            data: { products }
        });

    } catch (error) {
        console.error('Error updating products priority:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update products priority' },
            { status: 500 }
        );
    }
}

