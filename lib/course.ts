import { Course, CourseNode } from "./types";

const fallbackTopics = [
  "Foundations and mental models",
  "Core concepts and vocabulary",
  "Practical workflows",
  "Common pitfalls and misconceptions",
  "Projects and applied practice",
  "Advanced extensions",
];

export function makeId(prefix = "node") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function fallbackCourse(topic: string, audience: string, depth: number, format: Course["format"]): Course {
  const makeChildren = (parent: string, level: number): CourseNode[] => {
    if (level >= depth) return [];
    return ["What it is", "Why it matters", "How to apply it"].map((label, index) => ({
      id: makeId("fallback"),
      title: `${parent}: ${label}`,
      summary: `A focused breakdown of ${label.toLowerCase()} for ${parent}.`,
      learningObjectives: [
        `Explain ${label.toLowerCase()} in plain language`,
        `Recognize examples related to ${topic}`,
        `Apply the idea in a small exercise`,
      ],
      estimatedMinutes: 18 + index * 7,
      difficulty: level > 1 ? "intermediate" : "beginner",
      children: makeChildren(`${parent} / ${label}`, level + 1),
    }));
  };

  return {
    id: makeId("course"),
    topic,
    audience,
    depth,
    format,
    createdAt: new Date().toISOString(),
    overview: `A generated learning path for ${topic}, tuned for ${audience || "self-guided learners"}.`,
    nodes: fallbackTopics.map((title, index) => ({
      id: makeId("fallback"),
      title,
      summary: `A module covering ${title.toLowerCase()} in the context of ${topic}.`,
      learningObjectives: [
        `Understand the role of ${title.toLowerCase()} in ${topic}`,
        `Connect this module to the larger learning path`,
        `Complete a concrete practice task`,
      ],
      estimatedMinutes: 30 + index * 10,
      difficulty: index < 2 ? "beginner" : index < 4 ? "intermediate" : "advanced",
      children: makeChildren(title, 1),
    })),
  };
}

export function flattenNodes(nodes: CourseNode[], depth = 0, parentId?: string): Array<CourseNode & { depth: number; parentId?: string }> {
  return nodes.flatMap((node) => [
    { ...node, depth, parentId },
    ...flattenNodes(node.children, depth + 1, node.id),
  ]);
}
