export type CourseNode = {
  id: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  children: CourseNode[];
};

export type Course = {
  id: string;
  topic: string;
  audience: string;
  depth: number;
  format: "course" | "roadmap" | "mindmap";
  createdAt: string;
  overview: string;
  nodes: CourseNode[];
};
