"use client";

import { CourseNode } from "@/lib/types";

type Props = {
  topic: string;
  nodes: CourseNode[];
  onLessonSelect: (module: CourseNode, lesson: CourseNode, lessonNumber: string) => void;
};

export function MindMap({ topic, nodes, onLessonSelect }: Props) {
  return (
    <div className="roadmap-map" aria-label="Course mind map">
      <div className="map-title">{topic}</div>
      <div className="map-spine" />
      <div className="map-modules">
        {nodes.map((module, moduleIndex) => (
          <div className="map-module-row" key={module.id}>
            <div className="map-lessons left">
              {module.children.filter((_, i) => i % 2 === 0).map((lesson, i) => {
                const originalIndex = i * 2;
                return <button key={lesson.id} onClick={() => onLessonSelect(module, lesson, `${moduleIndex + 1}.${originalIndex + 1}`)}>{lesson.title}</button>;
              })}
            </div>
            <div className="map-module">{module.title.replace(/^Module\s+\d+\s*:\s*/i, "")}</div>
            <div className="map-lessons right">
              {module.children.filter((_, i) => i % 2 === 1).map((lesson, i) => {
                const originalIndex = i * 2 + 1;
                return <button key={lesson.id} onClick={() => onLessonSelect(module, lesson, `${moduleIndex + 1}.${originalIndex + 1}`)}>{lesson.title}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
