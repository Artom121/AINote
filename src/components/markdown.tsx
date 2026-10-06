import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown без сырого HTML: react-markdown его не исполняет. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
