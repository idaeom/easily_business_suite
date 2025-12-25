import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Private storage root (Project Root / storage / uploads)
// This is OUTSIDE "public" so it cannot be served statically.
const STORAGE_ROOT = join(process.cwd(), 'storage', 'uploads');

export interface SecureFileMetadata {
    originalName: string;
    storedName: string; // The UUID name
    path: string;       // Relative path for DB (e.g., "uploads/uuid.png" or just "uuid.png")
    absolutePath: string;
    mimeType: string;
    size: number;
}

export async function saveSecureFile(buffer: Buffer, originalName: string, mimeType: string): Promise<SecureFileMetadata> {
    // 1. Ensure storage directory exists
    await mkdir(STORAGE_ROOT, { recursive: true });

    // 2. Generate Safe Filename
    // Use UUID to prevent collisions and directory traversal (e.g. "../../etc/passwd")
    // Keep extension for convenience if validated, or just mappable.
    // Ideally, we just use UUID. Extension can be stored in DB.
    // Let's append a safe extension derived from mime or just .bin if we want to be super safe, 
    // but usually appending the validated extension is fine for FS viewing.
    const ext = originalName.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'bin';
    const storedName = `${randomUUID()}.${ext}`;
    const absolutePath = join(STORAGE_ROOT, storedName);

    // 3. Write File
    await writeFile(absolutePath, buffer);

    return {
        originalName,
        storedName,
        path: storedName, // Store just the filename, we know the root.
        absolutePath,
        mimeType,
        size: buffer.length
    };
}

export function getStorageRoot() {
    return STORAGE_ROOT;
}
