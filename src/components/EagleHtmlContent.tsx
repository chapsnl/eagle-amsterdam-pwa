interface EagleHtmlContentProps {
  html: string;
  className?: string;
}

const EagleHtmlContent = ({ html, className = "" }: EagleHtmlContentProps) => (
  <div
    className={`eagle-content-wrapper prose prose-invert prose-red max-w-none text-foreground ${className}`}
    dangerouslySetInnerHTML={{ __html: html }}
  />
);

export default EagleHtmlContent;
