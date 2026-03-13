import DOMPurify from 'dompurify';

interface EagleHtmlContentProps {
  html: string;
  className?: string;
}

const EagleHtmlContent = ({ html, className = "" }: EagleHtmlContentProps) => {
  const cleanContent = html
    .trim()
    .replace(/\n/g, '')
    .replace(/<p>&nbsp;<\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/(<br\s*\/?>){2,}/gi, '<br/>')
    .replace(/&nbsp;/g, ' ');

  return (
    <div
      className={`eagle-content-wrapper prose prose-invert prose-red max-w-none text-foreground ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cleanContent) }}
    />
  );
};

export default EagleHtmlContent;
