import React from 'react';

interface SuggestedQuestionsProps {
    onQuestionClick: (question: string) => void;
    questions: string[];
}

const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({ onQuestionClick, questions }) => {
    if (questions.length === 0) {
        return null;
    }

    return (
        <div className="mb-3 flex flex-wrap gap-2 justify-start">
            {questions.map((q, i) => (
                <button
                    key={i}
                    onClick={() => onQuestionClick(q)}
                    className="px-3 py-1.5 text-sm bg-secondary-background border border-border-color rounded-full hover:bg-gray-200 transition-colors"
                >
                    {q}
                </button>
            ))}
        </div>
    );
};

export default SuggestedQuestions;