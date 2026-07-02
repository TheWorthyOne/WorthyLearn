"use client";

import { useState } from "react";
import { CourseNode } from "@/lib/types";

type Props = {
  nodes: CourseNode[];
  onExpand: (path: string[]) => void;
  parentPath?: string[];
};

export function CourseTree({ nodes, onExpand, parentPath = [] }: Props) {
  return (
    <div className="tree">
      {nodes.map((node, index) => (
        <TreeNode key={node.id} node={node} index={index + 1} path={[...parentPath, node.title]} onExpand={onExpand} />
      ))}
    </div>
  );
}

function TreeNode({ node, index, path, onExpand }: { node: CourseNode; index: number; path: string[]; onExpand: (path: string[]) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <article className="node-card">
      <button className="node-title" onClick={() => setOpen(!open)}>
        <span>{index}</span>
        <strong>{node.title}</strong>
        <em>{node.difficulty} · {node.estimatedMinutes} min</em>
      </button>
      {open && (
        <div className="node-body">
          <p>{node.summary}</p>
          {node.learningObjectives.length > 0 && (
            <ul>
              {node.learningObjectives.map((objective) => <li key={objective}>{objective}</li>)}
            </ul>
          )}
          <div className="node-actions">
            <button onClick={() => onExpand(path)}>Expand this branch with AI</button>
          </div>
          {node.children.length > 0 && <CourseTree nodes={node.children} parentPath={path} onExpand={onExpand} />}
        </div>
      )}
    </article>
  );
}
