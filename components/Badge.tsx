import React from 'react';
import { AchievementProgress } from '../types';
import { Shield, Zap, Flame, Sunrise, Moon, CloudRain, Trophy, Heart, HeartHandshake, Sparkles, MapPin, Plane } from 'lucide-react';

interface BadgeProps {
    progress: AchievementProgress;
    onClick: () => void;
    size?: 'sm' | 'md' | 'lg';
}

const ICON_SIZES = {
    sm: 24,
    md: 32,
    lg: 40
};

// Exported function to get icon for use in modals
export const getBadgeIcon = (iconKey: string, size: number = 32) => {
    const props = { size, strokeWidth: 1.5 };

    switch (iconKey) {
        case 'BADGE_WARRIOR_WEEK':
            return <Shield {...props} />;
        case 'BADGE_STREAK_3':
            return <Flame {...props} />;
        case 'BADGE_STREAK_10':
            return <Zap {...props} />;
        case 'BADGE_EARLY_BIRD':
            return <Sunrise {...props} />;
        case 'BADGE_NIGHT_OWL':
            return <Moon {...props} />;
        case 'BADGE_RAINY_DAY':
            return <CloudRain {...props} />;
        case 'BADGE_LIKE_1':
            return <Heart {...props} />;
        case 'BADGE_LIKE_5':
            return <Heart {...props} />;
        case 'BADGE_LIKE_10':
            return <HeartHandshake {...props} />;
        case 'BADGE_LIKE_30':
            return <HeartHandshake {...props} />;
        case 'BADGE_LIKE_50':
            return <Sparkles {...props} />;
        case 'BADGE_LIKE_60':
            return <Sparkles {...props} />;
        case 'MAP_PIN':
            return <MapPin {...props} />;
        case 'PLANE':
            return <Plane {...props} />;
        default:
            return <Trophy {...props} />;
    }
};

export const Badge: React.FC<BadgeProps> = ({ progress, onClick, size = 'md' }) => {
    const { achievement, unlocked } = progress;
    const iconSize = ICON_SIZES[size];
    const icon = getBadgeIcon(achievement.iconKey, iconSize);

    const containerSizes = {
        sm: 'w-24 min-h-[110px]',
        md: 'w-28 min-h-[130px]',
        lg: 'w-32 min-h-[150px]'
    };

    const iconContainerSizes = {
        sm: 'w-11 h-11',
        md: 'w-14 h-14',
        lg: 'w-16 h-16'
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-start p-3 pt-4 rounded-2xl border-2
                transition-all duration-200 ${containerSizes[size]}
                ${unlocked
                    ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-300 shadow-md active:scale-95'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                }
            `}
        >
            {/* Icon container */}
            <div className={`
                ${iconContainerSizes[size]} rounded-full flex items-center justify-center mb-2 flex-shrink-0
                ${unlocked
                    ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600'
                    : 'bg-gray-200 text-gray-400'
                }
            `}>
                {icon}
            </div>

            {/* Badge name */}
            <span className={`
                text-[11px] font-semibold text-center leading-snug px-1 flex-grow flex items-start justify-center
                ${unlocked ? 'text-gray-800' : 'text-gray-500'}
            `}>
                {achievement.name}
            </span>

            {/* Locked indicator */}
            {!unlocked && (
                <div className="absolute top-1.5 right-1.5">
                    <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Unlocked sparkle indicator */}
            {unlocked && (
                <div className="absolute top-1.5 right-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>
                </div>
            )}
        </button>
    );
};
