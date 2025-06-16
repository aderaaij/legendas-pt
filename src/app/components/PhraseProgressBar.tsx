interface PhraseProgressBarProps {
  progressPercentage: number;
  state: 'New' | 'Learning' | 'Review' | 'Relearning';
  isLearned: boolean;
  className?: string;
}

export const PhraseProgressBar = ({ 
  progressPercentage, 
  state, 
  isLearned,
  className = ''
}: PhraseProgressBarProps) => {
  // Color mapping based on learning state
  const getColors = () => {
    if (isLearned) {
      return {
        bg: 'bg-green-100',
        progress: 'bg-green-500',
        text: 'text-green-700'
      };
    }
    
    switch (state) {
      case 'New':
        return {
          bg: 'bg-blue-100',
          progress: 'bg-blue-400',
          text: 'text-blue-700'
        };
      case 'Learning':
        return {
          bg: 'bg-yellow-100',
          progress: 'bg-yellow-500',
          text: 'text-yellow-700'
        };
      case 'Review':
        return {
          bg: 'bg-green-100',
          progress: 'bg-green-500',
          text: 'text-green-700'
        };
      case 'Relearning':
        return {
          bg: 'bg-orange-100',
          progress: 'bg-orange-500',
          text: 'text-orange-700'
        };
      default:
        return {
          bg: 'bg-gray-100',
          progress: 'bg-gray-400',
          text: 'text-gray-700'
        };
    }
  };

  const colors = getColors();
  const displayPercentage = Math.round(progressPercentage);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Progress bar */}
      <div className={`w-full h-2 ${colors.bg} rounded-full overflow-hidden`}>
        <div 
          className={`h-full ${colors.progress} transition-all duration-300 ease-out`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* State and percentage */}
      <div className="flex justify-between items-center text-xs">
        <span className={`font-medium ${colors.text}`}>
          {isLearned ? 'Learned' : state}
        </span>
        <span className={`${colors.text}`}>
          {displayPercentage}%
        </span>
      </div>
    </div>
  );
};