import { isUrlSafe, SSRFOptions } from './ssrf';

export async function safeFetch(
    urlInput: string | URL,
    init?: RequestInit,
    options: SSRFOptions = {}
): Promise<Response> {
    const maxRedirects = 5;
    let currentUrl = urlInput.toString();
    let redirectCount = 0;

    while (redirectCount < maxRedirects) {
        // 1. Validate URL before fetching
        const isSafe = await isUrlSafe(currentUrl, options);
        if (!isSafe) {
            throw new Error(`[SafeFetch] Blocked unsafe URL: ${currentUrl}`);
        }

        // 2. Fetch with manual redirect handling
        // We strictly control the redirect flow to validate the next hop
        const response = await fetch(currentUrl, {
            ...init,
            redirect: 'manual',
        });

        // 3. Handle Redirects (301, 302, 303, 307, 308)
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                throw new Error(`[SafeFetch] Redirect received without Location header`);
            }

            // Resolve relative URLs
            const nextUrl = new URL(location, currentUrl).toString();

            currentUrl = nextUrl;
            redirectCount++;
            continue;
        }

        return response;
    }

    throw new Error(`[SafeFetch] Too many redirects (limit: ${maxRedirects})`);
}
