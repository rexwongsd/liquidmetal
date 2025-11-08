
export interface HackathonIdea {
  title: string;
  description: string;
  category: 'Productivity Tool' | 'Creative Assistant' | 'Voice Agent' | 'Delightfully Weird' | 'Data Visualization' | 'Developer Tool';
  techStack: string[];
  justification: string;
}
