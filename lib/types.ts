export type CourseNode = {
  id: string;
  title: string;
  summary: string;
  learningObjectives: string[];
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  kind?: "module" | "lesson" | "topic";
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

export type LessonContent = {
  title: string;
  lessonNumber?: string;
  estimatedMinutes: number;
  introduction: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  diagram?: {
    title: string;
    nodes: string[];
    edges: Array<[string, string]>;
  };
  summary: string;
  checks: string[];
};
