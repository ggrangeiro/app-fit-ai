import React from 'react';

interface MuscleMapProps {
  muscles: string[];
}

const MuscleMap: React.FC<MuscleMapProps> = ({ muscles }) => {
  // Normalize input for easier matching
  const activeMuscles = muscles.map(m => m.toLowerCase());

  // Helper to check if a muscle group is active based on keywords
  const isActive = (keywords: string[]) => {
    return activeMuscles.some(muscle => 
      keywords.some(keyword => muscle.includes(keyword))
    );
  };

  // Define muscle states
  const highlights = {
    shoulders: isActive(['ombro', 'deltóide', 'deltoide', 'trapézio', 'trapezio']),
    chest: isActive(['peito', 'peitoral', 'tórax', 'torax', 'push', 'crucifixo', 'cross']),
    back: isActive(['costas', 'dorsal', 'lombar', 'latíssimo', 'grande dorsal']),
    arms: isActive(['braço', 'bíceps', 'biceps', 'tríceps', 'triceps', 'antebraço']),
    abs: isActive(['abdômen', 'abdomen', 'abdominal', 'core', 'barriga', 'prancha']),
    glutes: isActive(['glúteo', 'gluteo', 'bumbum', 'quadril']),
    quads: isActive(['quadríceps', 'quadriceps', 'coxa', 'perna', 'anterior', 'agachamento', 'squat']),
    hamstrings: isActive(['posterior', 'isquiotibiais', 'femoral']),
    calves: isActive(['panturrilha', 'gastrocnêmio', 'sóleo'])
  };

  const getFill = (active: boolean) => active ? "#60a5fa" : "#334155";
  const getOpacity = (active: boolean) => active ? 1 : 0.3;
  const getFilter = (active: boolean) => active ? "url(#glow)" : "";

  return (
    <div className="flex justify-center items-center gap-8 h-full w-full py-4">
      <svg viewBox="0 0 200 250" className="h-48 md:h-64 w-auto">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- FRONT VIEW --- */}
        <g transform="translate(0, 0)">
          <text x="50" y="240" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="1">FRENTE</text>
          
          {/* Head */}
          <circle cx="50" cy="20" r="12" fill="#1e293b" stroke="#475569" strokeWidth="1"/>
          
          {/* Shoulders (Delts) */}
          <path d="M28,35 Q50,30 72,35 L78,50 L22,50 Z" 
            fill={getFill(highlights.shoulders)} opacity={getOpacity(highlights.shoulders)} filter={getFilter(highlights.shoulders)} />

          {/* Chest */}
          <path d="M30,52 L70,52 L65,75 L35,75 Z" 
            fill={getFill(highlights.chest)} opacity={getOpacity(highlights.chest)} filter={getFilter(highlights.chest)} />

          {/* Arms (Biceps/Triceps area) */}
          <path d="M20,52 L28,52 L25,90 L18,90 Z" 
            fill={getFill(highlights.arms)} opacity={getOpacity(highlights.arms)} filter={getFilter(highlights.arms)} />
          <path d="M72,52 L80,52 L82,90 L75,90 Z" 
            fill={getFill(highlights.arms)} opacity={getOpacity(highlights.arms)} filter={getFilter(highlights.arms)} />

          {/* Abs/Core */}
          <path d="M36,77 L64,77 L62,105 L38,105 Z" 
            fill={getFill(highlights.abs)} opacity={getOpacity(highlights.abs)} filter={getFilter(highlights.abs)} />

          {/* Quads */}
          <path d="M38,108 L62,108 L68,160 L52,165 L32,160 Z" 
            fill={getFill(highlights.quads)} opacity={getOpacity(highlights.quads)} filter={getFilter(highlights.quads)} />

          {/* Calves (Front view/Shins) */}
          <path d="M36,170 L50,168 L64,170 L60,210 L40,210 Z" 
            fill={getFill(highlights.calves)} opacity={getOpacity(highlights.calves)} filter={getFilter(highlights.calves)} />
        </g>

        {/* --- BACK VIEW --- */}
        <g transform="translate(100, 0)">
          <text x="50" y="240" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600" letterSpacing="1">COSTAS</text>

          {/* Head */}
          <circle cx="50" cy="20" r="12" fill="#1e293b" stroke="#475569" strokeWidth="1"/>

          {/* Upper Back / Traps / Shoulders */}
          <path d="M25,35 L75,35 L70,60 L30,60 Z" 
            fill={getFill(highlights.back || highlights.shoulders)} opacity={getOpacity(highlights.back || highlights.shoulders)} filter={getFilter(highlights.back || highlights.shoulders)} />

          {/* Lats / Mid Back */}
          <path d="M32,62 L68,62 L64,95 L36,95 Z" 
            fill={getFill(highlights.back)} opacity={getOpacity(highlights.back)} filter={getFilter(highlights.back)} />

          {/* Arms (Triceps view) */}
          <path d="M18,52 L28,52 L26,90 L16,90 Z" 
            fill={getFill(highlights.arms)} opacity={getOpacity(highlights.arms)} filter={getFilter(highlights.arms)} />
          <path d="M72,52 L82,52 L84,90 L74,90 Z" 
            fill={getFill(highlights.arms)} opacity={getOpacity(highlights.arms)} filter={getFilter(highlights.arms)} />

          {/* Glutes */}
          <path d="M36,97 L64,97 L68,125 L32,125 Z" 
            fill={getFill(highlights.glutes)} opacity={getOpacity(highlights.glutes)} filter={getFilter(highlights.glutes)} />

          {/* Hamstrings */}
          <path d="M34,128 L66,128 L62,165 L38,165 Z" 
            fill={getFill(highlights.hamstrings)} opacity={getOpacity(highlights.hamstrings)} filter={getFilter(highlights.hamstrings)} />

          {/* Calves */}
          <path d="M38,168 L62,168 L60,205 L40,205 Z" 
            fill={getFill(highlights.calves)} opacity={getOpacity(highlights.calves)} filter={getFilter(highlights.calves)} />
        </g>
      </svg>
    </div>
  );
};

export default MuscleMap;