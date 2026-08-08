import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ReactNode } from "react";

const components: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const inline = !match && !String(children).includes("\n");
    if (inline) {
      return (
        <code
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="overflow-x-auto rounded-xl border border-slate-700/70 bg-[#0b1220] p-3">
        <code className={`font-mono text-[0.86em] text-cyan-100 ${className ?? ""}`} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-cyan-300 underline decoration-cyan-400/40 underline-offset-4 hover:text-cyan-100"
        {...props}
      >
        {children}
      </a>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-slate-50">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic text-slate-100">{children}</em>;
  },
  del({ children }) {
    return <del className="text-slate-300 decoration-slate-500">{children}</del>;
  },
  h1({ children }) {
    return <h1 className="mt-4 mb-1 text-lg font-bold text-cyan-50 first:mt-0">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mt-3 mb-1 text-base font-semibold text-cyan-50 first:mt-0">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mt-3 font-semibold text-cyan-50 first:mt-0">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="mt-2 font-semibold text-cyan-50 first:mt-0">{children}</h4>;
  },
  h5({ children }) {
    return <h5 className="mt-2 font-semibold text-cyan-50 first:mt-0">{children}</h5>;
  },
  ul({ children }) {
    return <ul className="ml-5 list-disc space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="ml-5 list-decimal space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-slate-200">{children}</li>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-cyan-500/50 pl-3 text-slate-300">
        {children}
      </blockquote>
    );
  },
  table({ children }: { children?: ReactNode }) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-700/70">
        <table className="min-w-full divide-y divide-slate-700/70 text-left text-sm">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-slate-900/80">{children}</thead>;
  },
  th({ children }) {
    return <th className="px-3 py-2 font-semibold text-cyan-100">{children}</th>;
  },
  td({ children }) {
    return <td className="px-3 py-2 text-slate-200">{children}</td>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-slate-800/80">{children}</tbody>;
  },
  p({ children }) {
    return <p className="text-slate-200">{children}</p>;
  },
  hr() {
    return <hr className="my-3 border-slate-700/70" />;
  },
};

export function MarkdownRenderer({ children }: { children: string }) {
  return (
    <div className="space-y-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
