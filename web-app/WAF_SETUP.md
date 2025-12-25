# WAF Configuration Guide

Since `easily_business_suite` is a web application, it is highly recommended to place it behind a Web Application Firewall (WAF) to protect against OWASP Top 10 attacks, Bots, and DDoS.

## Option 1: Vercel Firewall (If hosted on Vercel)
Vercel provides a built-in firewall.
1. Go to Project Settings > Security > Firewall.
2. **Enable Attack Protection**: Blocks common threats.
3. **Block IP/Region**: If you only operate in a specific country (e.g., Nigeria), block traffic from other regions to reduce attack surface.
4. **Rate Limiting**: Can be configured at edge level here as well.

## Option 2: Cloudflare (Recommended)
1. **Proxy DNS**: Ensure your domain DNS is proxied (Orange Cloud) through Cloudflare.
2. **WAF Rules**:
   - Go to Security > WAF.
   - **Create Rule**: "Block Bad Bots"
     - Expression: `(cf.client.bot) or (http.user_agent contains "curl")`
     - Action: Block
   - **Turn on Managed Rules**: Enable Cloudflare Managed Ruleset (Free/Pro).
3. **Rate Limiting**:
   - Set a rate limit rule for `/api/auth/login`.
   - Threshold: 5 requests per 1 minute.
   - Action: Challenge (Captcha).

## Verification
- Visit your site and check headers for `cf-ray` (Cloudflare) or `x-vercel-id`.
- Attempt a basic SQL Injection payload in a URL parameter (`?q=' OR 1=1`) and verify the WAF blocks it (403 Forbidden).

## Internal Application Security (SSRF Prevention)
In addition to the WAF, the application implements internal defenses against Server-Side Request Forgery (SSRF).

### Safe Fetch Utility
Use `safeFetch` instead of the native `fetch` when making requests to user-supplied URLs (e.g., Webhooks, Image Imports).

```typescript
import { safeFetch } from "@/lib/security/safe-fetch";

try {
    const response = await safeFetch(userUrl, { method: "GET" }, {
        // Optional: Allow specific domains only
        allowList: ["api.paystack.co", "api.squadco.com"]
    });
} catch (error) {
    console.error("Blocked unsafe request:", error);
}
```

### Features
1. **Private IP Blocking**: Automatically blocks requests to local networks (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, etc.) and AWS/Cloud metadata services (`169.254.169.254`).
2. **DNS Resolution**: Resolves hostnames to ensure they don't point to internal IPs (DNS Rebinding protection).
3. **Redirect Control**: Manually follows redirects to validate every hop.

