import { getDatabase } from './mongodb';

// ----------------- HELPERS -----------------

function cleanChars(text: string): string {
  /**Extract only alphabet characters*/
  return text.replace(/[^a-zA-Z]/g, '');
}

function mixedCaseChars(chars: string, lowerRatio: number = 0.7): string {
  /**Make mixed case with more lowercase*/
  const result: string[] = [];
  for (const c of chars) {
    if (Math.random() < lowerRatio) {
      result.push(c.toLowerCase());
    } else {
      result.push(c.toUpperCase());
    }
  }
  return result.join('');
}

function randomFromName(name: string, count: number): string {
  const chars = cleanChars(name);
  let availableChars = chars;
  
  // If not enough chars, add random letters
  if (availableChars.length < count) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = availableChars.length; i < count; i++) {
      availableChars += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  
  // Sample random characters
  const shuffled = availableChars.split('').sort(() => 0.5 - Math.random());
  const sampled = shuffled.slice(0, count).join('');
  
  return mixedCaseChars(sampled); // mixed case here
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

// ----------------- ID GENERATORS -----------------

export async function generateProductId(name: string): Promise<string> {
  const db = await getDatabase();
  const products = db.collection('products');
  
  while (true) {
    const pid = randomFromName(name, 5) + randomDigits(4);
    
    // Check if ID already exists
    const existing = await products.findOne({ _id: pid } as any);
    if (!existing) {
      return pid;
    }
  }
}

export async function generateCategoryId(name: string): Promise<string> {
  const db = await getDatabase();
  const categories = db.collection('categories');
  
  while (true) {
    const letters = randomFromName(name, 6);
    const digit = randomDigits(1);
    const cid = letters + digit;
    
    // Check if ID already exists
    const existing = await categories.findOne({ _id: cid } as any);
    if (!existing) {
      return cid;
    }
  }
}

export async function generateSubcategoryId(name: string): Promise<string> {
  const db = await getDatabase();
  const subcategories = db.collection('subcategories');
  
  while (true) {
    const letters = randomFromName(name, 7);
    const digit = randomDigits(1);
    const sid = letters + digit;
    
    // Check if ID already exists
    const existing = await subcategories.findOne({ _id: sid } as any);
    if (!existing) {
      return sid;
    }
  }
}
