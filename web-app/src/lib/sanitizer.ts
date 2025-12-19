import DOMPurify from "isomorphic-dompurify";

export function sanitizeHtml(content: string): string {
    // 1. Add a Hook to enforce security on links
    DOMPurify.addHook('afterSanitizeAttributes', function (node) {
        // Check if the node is an anchor tag <a>
        if ('target' in node) {
            const target = node.getAttribute('target');

            if (target === '_blank') {
                // Prevent the new tab from hijacking the original tab
                node.setAttribute('rel', 'noopener noreferrer');
            }
        }
    });

    // 2. Run the sanitizer with your allow-list
    return DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        // Note: We allow 'rel' here so our Hook can add it, 
        // but DOMPurify strips unsafe user-supplied rel values by default.
        ALLOWED_ATTR: ['href', 'target', 'rel'],

        // extra safety: prevent 'javascript:' URIs specifically (DOMPurify does this by default, but good to be explicit in intent)
        ALLOW_DATA_ATTR: false,
    });
}
