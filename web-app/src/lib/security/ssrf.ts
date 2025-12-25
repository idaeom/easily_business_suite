import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';

export interface SSRFOptions {
    allowList?: string[]; // Array of allowed domains or regex strings
    denyList?: string[]; // Additional blocked domains/IPs
    allowPrivate?: boolean; // Dangerous: allow private IPs (default false)
}

// Ranges to block
const PRIVATE_RANGES_IPV4 = [
    { start: '10.0.0.0', end: '10.255.255.255' },       // 10.0.0.0/8
    { start: '172.16.0.0', end: '172.31.255.255' },     // 172.16.0.0/12
    { start: '192.168.0.0', end: '192.168.255.255' },   // 192.168.0.0/16
    { start: '127.0.0.0', end: '127.255.255.255' },     // 127.0.0.0/8 (Loopback)
    { start: '169.254.0.0', end: '169.254.255.255' },   // 169.254.0.0/16 (Link-local)
    { start: '0.0.0.0', end: '0.255.255.255' },         // 0.0.0.0/8
];

// Helper to convert IP to long
function ipToLong(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
    const longIp = ipToLong(ip);
    return PRIVATE_RANGES_IPV4.some(range => {
        return longIp >= ipToLong(range.start) && longIp <= ipToLong(range.end);
    });
}

function isPrivateIPv6(ip: string): boolean {
    // Simplistic IPv6 checks for now
    // ::1 loopback
    if (ip === '::1') return true;
    // fe80::/10 link-local
    if (ip.toLowerCase().startsWith('fe80:')) return true;
    // fc00::/7 unique local
    if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
    return false;
}

export async function isUrlSafe(urlInput: string, options: SSRFOptions = {}): Promise<boolean> {
    try {
        const parsedUrl = new URL(urlInput);

        // 1. Protocol Check
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            console.warn(`[SSRF] Blocked protocol: ${parsedUrl.protocol}`);
            return false;
        }

        // 2. Allow List Check (Domain based)
        if (options.allowList && options.allowList.length > 0) {
            const allowed = options.allowList.some(pattern => {
                // Simple string match or * wildcard logic could go here.
                // For now, strict domain match or regex.
                if (pattern.startsWith('/') && pattern.endsWith('/')) {
                    try {
                        return new RegExp(pattern.slice(1, -1)).test(parsedUrl.hostname);
                    } catch { return false; }
                }
                return parsedUrl.hostname === pattern || parsedUrl.hostname.endsWith(`.${pattern}`);
            });
            if (!allowed) {
                console.warn(`[SSRF] Domain not in allowlist: ${parsedUrl.hostname}`);
                return false;
            }
        }

        // 3. DNS Resolution & IP Check
        // If hostname is an IP, check directly
        if (net.isIP(parsedUrl.hostname)) {
            if (options.allowPrivate) return true;
            if (net.isIPv4(parsedUrl.hostname) && isPrivateIPv4(parsedUrl.hostname)) return false;
            if (net.isIPv6(parsedUrl.hostname) && isPrivateIPv6(parsedUrl.hostname)) return false;
            return true;
        }

        // Resolve Hostname
        const addresses = await dns.lookup(parsedUrl.hostname, { all: true });

        // Check all resolved addresses
        for (const addr of addresses) {
            if (!options.allowPrivate) {
                if (addr.family === 4 && isPrivateIPv4(addr.address)) {
                    console.warn(`[SSRF] Blocked private IP resolution: ${parsedUrl.hostname} -> ${addr.address}`);
                    return false;
                }
                if (addr.family === 6 && isPrivateIPv6(addr.address)) {
                    console.warn(`[SSRF] Blocked private IP resolution: ${parsedUrl.hostname} -> ${addr.address}`);
                    return false;
                }
            }
        }

        return true;
    } catch (error) {
        console.error(`[SSRF] Error validating URL: ${error}`);
        return false;
    }
}
