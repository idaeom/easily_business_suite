import { fileTypeFromBuffer } from 'file-type';

export const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // docx
];

export async function validateFileBuffer(buffer: Buffer): Promise<{ isValid: boolean; mime?: string; ext?: string }> {
    // 1. Check Magic Numbers using file-type
    const type = await fileTypeFromBuffer(buffer);

    if (!type) {
        // Some text-based files (CSV) might not have magic numbers, fallback to basic check or strict rejection?
        // For CSV, it's tricky. Let's handle strict for strictly binary formats first.
        // If it's a CSV, we might need a different check, but for now let's be strict.
        return { isValid: false };
    }

    // 2. Validate against Allowed List
    if (ALLOWED_MIME_TYPES.includes(type.mime)) {
        return { isValid: true, mime: type.mime, ext: type.ext };
    }

    return { isValid: false, mime: type.mime };
}
