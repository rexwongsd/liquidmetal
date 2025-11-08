import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-4 md:p-6">
      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
        Hackathon Idea Spark
      </h1>
      <p className="mt-2 text-lg text-gray-300 max-w-2xl mx-auto">
        Paste your hackathon's rules or use your voice, then listen to AI-generated ideas tailored to the requirements.
      </p>
    </header>
  );
};

export default Header;