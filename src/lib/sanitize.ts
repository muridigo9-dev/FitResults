import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 * 
 * This module provides secure HTML sanitization for user-provided content.
 * Always use these functions when rendering HTML from any external source,
 * including admin-provided templates.
 */

/**
 * Sanitize HTML for safe rendering
 * Removes: scripts, event handlers, dangerous URLs, iframes
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }

  return DOMPurify.sanitize(dirty, {
    // Allowed tags for email templates and rich content
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "i", "em", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span",
      "blockquote", "pre", "code",
      "hr",
    ],
    // Allowed attributes
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "style",
      "width", "height", "align", "valign",
      "border", "cellpadding", "cellspacing",
      "target", "rel",
    ],
    // Allow safe URL schemes only
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Block dangerous protocols
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onmouseout",
      "onfocus", "onblur", "onkeydown", "onkeyup", "onkeypress",
      "onsubmit", "onreset", "onchange", "oninput",
    ],
  });
}

/**
 * Sanitize HTML with minimal allowed tags (for comments, simple text)
 */
export function sanitizeSimpleHtml(dirty: string): string {
  if (!dirty) return "";

  if (typeof window === "undefined") {
    return dirty.replace(/<[^>]*>/g, "");
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "i", "em", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Strip all HTML tags, returning plain text only
 */
export function stripHtml(dirty: string): string {
  if (!dirty) return "";

  if (typeof window === "undefined") {
    return dirty.replace(/<[^>]*>/g, "");
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize for email preview specifically
 * More permissive for styling but still secure
 */
export function sanitizeEmailHtml(dirty: string): string {
  if (!dirty) return "";

  if (typeof window === "undefined") {
    return dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=/gi, "");
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // Structure
      "html", "head", "body", "div", "span", "section", "header", "footer", "main",
      // Text
      "p", "br", "strong", "b", "i", "em", "u", "s", "small",
      "h1", "h2", "h3", "h4", "h5", "h6",
      // Lists
      "ul", "ol", "li",
      // Links and images
      "a", "img",
      // Tables (common in emails)
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      // Semantic
      "blockquote", "pre", "code", "hr",
      // Style (for inline email CSS)
      "style",
      // Meta (for email)
      "meta", "title", "link",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "id", "style",
      "width", "height", "align", "valign", "bgcolor", "background",
      "border", "cellpadding", "cellspacing", "colspan", "rowspan",
      "target", "rel", "type", "media",
      "charset", "name", "content", "http-equiv",
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onmouseout",
      "onfocus", "onblur", "onkeydown", "onkeyup", "onkeypress",
      "onsubmit", "onreset", "onchange", "oninput", "onabort",
      "ondblclick", "ondrag", "ondrop", "onmousedown", "onmouseup",
    ],
    // Allow data URLs for images (common in emails)
    ADD_DATA_URI_TAGS: ["img"],
  });
}

/**
 * Check if a string contains potentially dangerous content
 */
export function hasDangerousContent(content: string): boolean {
  if (!content) return false;

  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
  ];

  return dangerousPatterns.some((pattern) => pattern.test(content));
}
