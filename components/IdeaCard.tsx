
import React from 'react';
import { HackathonIdea } from '../types';

interface IdeaCardProps {
  idea: HackathonIdea;
}

const CategoryPill: React.FC<{ category: string }> = ({ category }) => {
    const colorMap: { [key: string]: string } = {
        'Productivity Tool': 'bg-blue-500/20 text-blue-300',
        'Creative Assistant': 'bg-purple-500/20 text-purple-300',
        'Voice Agent': 'bg-green-500/20 text-green-300',
        'Delightfully Weird': 'bg-pink-500/20 text-pink-300',
        'Data Visualization': 'bg-yellow-500/20 text-yellow-300',
        'Developer Tool': 'bg-indigo-500/20 text-indigo-300',
    };
    return (
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${colorMap[category] || 'bg-gray-500/20 text-gray-300'}`}>
            {category}
        </span>
    );
};

const IdeaCard: React.FC<IdeaCardProps> = ({ idea }) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-lg transform hover:scale-105 transition-transform duration-300 ease-in-out">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
        <h3 className="text-2xl font-bold text-white">{idea.title}</h3>
        <CategoryPill category={idea.category} />
      </div>
      <p className="text-gray-300 mb-4">{idea.description}</p>
      
      <div className="mb-4">
        <h4 className="font-semibold text-gray-200 mb-2">Suggested Tech Stack:</h4>
        <div className="flex flex-wrap gap-2">
          {idea.techStack.map((tech, index) => (
            <span key={index} className="bg-gray-700 text-gray-200 text-xs font-mono px-2 py-1 rounded">
              {tech}
            </span>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-gray-200 mb-2">Justification:</h4>
        <p className="text-sm text-gray-400 italic border-l-2 border-indigo-500 pl-3">{idea.justification}</p>
      </div>
    </div>
  );
};

export default IdeaCard;
