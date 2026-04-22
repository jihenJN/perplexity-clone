import React from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function DisplaySummary({ aiResp }) {
  return (
    <div className="mt-7">
      {!aiResp && 
      <div>
        <div className='w-full h-4 animate-pulse bg-accent rounded-md'> </div>
         <div className='w-1/2 mt-2 h-4 animate-pulse bg-accent rounded-md'> </div>
          <div className='w-[70%] mt-2 h-4 animate-pulse bg-accent rounded-md'> </div>
      </div>}
      <Markdown
     components={{
        h1: ({ ...props }) => (
          <h1 className="text-2xl font-semibold text-gray-900 mt-6 mb-3" {...props} />
        ),
        h2: ({ ...props }) => (
          <h2 className="text-xl font-semibold text-gray-900 mt-5 mb-2" {...props} />
        ),
        h3: ({ ...props }) => (
          <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2" {...props} />
        ),
        p: ({ ...props }) => (
          <p className="text-gray-700 leading-7 mb-4" {...props} />
        ),

        a: ({ ...props }) => (
          <a
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
            {...props}
          />
        ),

        ul: ({ ...props }) => (
          <ul className="list-disc pl-5 space-y-1 text-gray-700" {...props} />
        ),
        ol: ({ ...props }) => (
          <ol className="list-decimal pl-5 space-y-1 text-gray-700" {...props} />
        ),
        li: ({ ...props }) => (
          <li className="leading-7" {...props} />
        ),

        blockquote: ({ ...props }) => (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4" {...props} />
        ),

        // Tables
        table: ({ ...props }) => (
          <table className="w-full border-collapse text-sm my-4" {...props} />
        ),
        th: ({ ...props }) => (
          <th className="border-b border-gray-300 px-3 py-2 text-left font-medium text-gray-700" {...props} />
        ),
        td: ({ ...props }) => (
          <td className="border-b border-gray-200 px-3 py-2 text-gray-700" {...props} />
        ),

        // Inline + block code
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");

          return !inline && match ? (
            <div className="my-4">
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-lg text-sm"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          );
        },
      }}
      >{aiResp}</Markdown>
    </div>
  );
}

export default DisplaySummary;
