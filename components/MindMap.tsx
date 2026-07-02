"use client";

import { CourseNode } from "@/lib/types";

type Props = { topic: string; nodes: CourseNode[] };

export function MindMap({ topic, nodes }: Props) {
  return (
    <div className="mindmap" aria-label="Course mind map">
      <div className="mindmap-root">{topic}</div>
      <div className="mindmap-branches">
        {nodes.map((node) => <MindNode key={node.id} node={node} />)}
      </div>
    </div>
  );
}

function MindNode({ node }: { node: CourseNode }) {
  return (
    <div className="mind-node-wrap">
      <div className="mind-node">
        <strong>{node.title}</strong>
        <small>{node.difficulty}</small>
      </div>
      {node.children.length > 0 && (
        <div className="mind-children">
          {node.children.map((child) => <MindNode key={child.id} node={child} />)}
        </div>
      )}
    </div>
  );
}
