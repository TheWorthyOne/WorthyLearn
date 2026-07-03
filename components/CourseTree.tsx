"use client";

import { useState } from "react";
import { CourseNode } from "@/lib/types";

type Props = {
  nodes: CourseNode[];
  onExpand: (path: string[]) => void;
  onLessonSelect: (module: CourseNode, lesson: CourseNode, lessonNumber: string) => void;
  parentPath?: string[];
};

export function CourseTree({ nodes, onExpand, onLessonSelect, parentPath = [] }: Props) {
  return (
    <div className="syllabus-list">
      {nodes.map((node, index) => (
        <ModuleBlock
          key={node.id}
          module={node}
          moduleIndex={index + 1}
          path={[...parentPath, node.title]}
          onExpand={onExpand}
          onLessonSelect={onLessonSelect}
        />
      ))}
    </div>
  );
}

function ModuleBlock({ module, moduleIndex, path, onExpand, onLessonSelect }: {
  module: CourseNode;
  moduleIndex: number;
  path: string[];
  onExpand: (path: string[]) => void;
  onLessonSelect: (module: CourseNode, lesson: CourseNode, lessonNumber: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const cleanTitle = module.title.replace(/^Module\s+\d+\s*:\s*/i, "");

  return (
    <section className="module-block">
      <button className="module-heading" onClick={() => setOpen(!open)}>
        <strong>Module {moduleIndex}: {cleanTitle}</strong>
        <span>{module.children.length} lessons</span>
      </button>
      {open && (
        <div className="lesson-list">
          {module.children.map((lesson, lessonIndex) => {
            const lessonNumber = `${moduleIndex}.${lessonIndex + 1}`;
            return (
              <div className="lesson-row" key={lesson.id}>
                <button className="lesson-main" onClick={() => onLessonSelect(module, lesson, lessonNumber)}>
                  <span>{lessonIndex + 1}</span>
                  <span>{lesson.title}</span>
                </button>
                <button className="start-btn" onClick={() => onLessonSelect(module, lesson, lessonNumber)}>Start →</button>
              </div>
            );
          })}
          <button className="expand-module" onClick={() => onExpand(path)}>Add more lessons to this module</button>
        </div>
      )}
    </section>
  );
}
