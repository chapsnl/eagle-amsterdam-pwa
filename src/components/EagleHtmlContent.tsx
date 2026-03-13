import { memo, useMemo } from "react";
import DOMPurify from "dompurify";

interface EagleHtmlContentProps {
  html: string;
  className?: string;
}

const EagleHtmlContent = memo(({ html, className = "" }: EagleHtmlContentProps) => {
  const sanitizedHtml = useMemo(() => {
    const cleaned = html
      .trim()
      .replace(/\r?\n|\r/g, "")
      .replace(/<p[^>]*>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, "")
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br/>")
      .replace(/&nbsp;/gi, " ")
      .trim();
    return DOMPurify.sanitize(cleaned);
  }, [html]);

  return (
    <div
      className={`eagle-content-wrapper prose prose-invert prose-red max-w-none text-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
});

EagleHtmlContent.displayName = "EagleHtmlContent";

export default EagleHtmlContent;
