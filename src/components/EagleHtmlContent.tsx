import DOMPurify from 'dompurify';

interface EagleHtmlContentProps {
  html: string;
  className?: string;
}

const EagleHtmlContent = ({ html, className = "" }: EagleHtmlContentProps) => {
  const cleanContent = html
    .trim()
    .replace(/\r?\n|\r/g, '')
    .replace(/<p[^>]*>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br/>')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  return (
    <div
      className={`eagle-content-wrapper prose prose-invert prose-red max-w-none text-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanContent) }}
    />
  );
};

export default EagleHtmlContent;
