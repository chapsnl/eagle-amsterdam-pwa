import DOMPurify from 'dompurify';

interface EagleHtmlContentProps {
  html: string;
  className?: string;
}

const EagleHtmlContent = ({ html, className = "" }: EagleHtmlContentProps) => (
  <div
    className={`eagle-content-wrapper prose prose-invert prose-red max-w-none text-foreground ${className}`}
    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
  />
);

export default EagleHtmlContent;
