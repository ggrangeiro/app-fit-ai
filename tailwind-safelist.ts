/**
 * Tailwind Safelist - Classes Dinâmicas
 * 
 * Este arquivo existe apenas para garantir que o Tailwind inclua
 * TODAS as classes que podem ser geradas dinamicamente pela IA
 * (Gemini) nos planos de Dieta e Treino.
 * 
 * O Tailwind escaneia este arquivo durante o build e inclui
 * essas classes no CSS final, mesmo que não apareçam em outros arquivos.
 * 
 * NÃO REMOVA ESTE ARQUIVO!
 */

// ============================================
// CLASSES DE BACKGROUND (FUNDO)
// ============================================
const bgClasses = [
    // Brancos e Cinzas
    'bg-white', 'bg-slate-50', 'bg-slate-100', 'bg-slate-800', 'bg-slate-900',
    'bg-gray-50', 'bg-gray-100', 'bg-gray-800', 'bg-gray-900',

    // Verdes (Emerald/Teal)
    'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200', 'bg-emerald-500', 'bg-emerald-600', 'bg-emerald-700', 'bg-emerald-800',
    'bg-teal-50', 'bg-teal-100', 'bg-teal-500', 'bg-teal-600', 'bg-teal-700',
    'bg-green-50', 'bg-green-100', 'bg-green-500', 'bg-green-600',

    // Azuis
    'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700',
    'bg-sky-50', 'bg-sky-100', 'bg-sky-500',
    'bg-cyan-50', 'bg-cyan-100', 'bg-cyan-500',
    'bg-indigo-50', 'bg-indigo-100', 'bg-indigo-500',

    // Amarelos/Laranjas
    'bg-amber-50', 'bg-amber-100', 'bg-amber-200', 'bg-amber-500', 'bg-amber-600',
    'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-500',
    'bg-orange-50', 'bg-orange-100', 'bg-orange-500',

    // Vermelhos/Rosas
    'bg-red-50', 'bg-red-100', 'bg-red-500', 'bg-red-600',
    'bg-rose-50', 'bg-rose-100', 'bg-rose-500',
    'bg-pink-50', 'bg-pink-100', 'bg-pink-500',

    // Roxos
    'bg-purple-50', 'bg-purple-100', 'bg-purple-500',
    'bg-violet-50', 'bg-violet-100', 'bg-violet-500',
    'bg-fuchsia-50', 'bg-fuchsia-100', 'bg-fuchsia-500',

    // Gradientes
    'bg-gradient-to-r', 'bg-gradient-to-l', 'bg-gradient-to-t', 'bg-gradient-to-b',
    'bg-gradient-to-br', 'bg-gradient-to-bl', 'bg-gradient-to-tr', 'bg-gradient-to-tl',
    'from-emerald-500', 'from-teal-600', 'from-blue-500', 'from-indigo-500',
    'to-teal-600', 'to-emerald-600', 'to-blue-600', 'to-indigo-600',

    // Transparências
    'bg-white/20', 'bg-white/10', 'bg-black/50', 'bg-black/70', 'bg-black/80',
];

// ============================================
// CLASSES DE TEXTO (COR)
// ============================================
const textClasses = [
    // Escuros (para fundos claros)
    'text-slate-900', 'text-slate-800', 'text-slate-700', 'text-slate-600', 'text-slate-500', 'text-slate-400', 'text-slate-300',
    'text-gray-900', 'text-gray-800', 'text-gray-700', 'text-gray-600', 'text-gray-500',

    // Brancos (para fundos escuros)
    'text-white', 'text-slate-50', 'text-gray-50',

    // Coloridos
    'text-emerald-800', 'text-emerald-700', 'text-emerald-600', 'text-emerald-500', 'text-emerald-400', 'text-emerald-100',
    'text-teal-900', 'text-teal-800', 'text-teal-700', 'text-teal-600', 'text-teal-500',
    'text-green-800', 'text-green-700', 'text-green-600', 'text-green-500',
    'text-blue-800', 'text-blue-700', 'text-blue-600', 'text-blue-500', 'text-blue-400',
    'text-amber-800', 'text-amber-700', 'text-amber-600', 'text-amber-500',
    'text-red-800', 'text-red-700', 'text-red-600', 'text-red-500',
    'text-purple-800', 'text-purple-700', 'text-purple-600', 'text-purple-500',
    'text-pink-800', 'text-pink-700', 'text-pink-600', 'text-pink-500',
    'text-orange-800', 'text-orange-700', 'text-orange-600', 'text-orange-500',
];

// ============================================
// CLASSES DE LAYOUT
// ============================================
const layoutClasses = [
    // Grid
    'grid', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4',
    'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4',
    'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4',
    'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4',

    // Flex
    'flex', 'flex-col', 'flex-row', 'flex-wrap',
    'items-center', 'items-start', 'items-end',
    'justify-center', 'justify-between', 'justify-start', 'justify-end',

    // Gap
    'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8',

    // Display
    'block', 'inline-block', 'inline-flex', 'hidden',
    'md:block', 'md:hidden', 'lg:block', 'lg:hidden',
];

// ============================================
// CLASSES DE ESPAÇAMENTO
// ============================================
const spacingClasses = [
    // Padding
    'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16',
    'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8',
    'py-1', 'py-1.5', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8',
    'pt-2', 'pt-4', 'pb-2', 'pb-4', 'pl-2', 'pl-4', 'pr-2', 'pr-4',

    // Margin
    'm-0', 'm-1', 'm-2', 'm-4', 'm-6', 'm-8',
    'mx-auto', 'mx-2', 'mx-4',
    'my-2', 'my-4', 'my-6', 'my-8',
    'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-6', 'mb-8',
    'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-6', 'mt-8',
    'ml-1', 'ml-2', 'ml-4', 'mr-1', 'mr-2', 'mr-4',

    // Space between
    'space-y-1', 'space-y-2', 'space-y-3', 'space-y-4',
    'space-x-1', 'space-x-2', 'space-x-3', 'space-x-4',
];

// ============================================
// CLASSES DE BORDAS E SOMBRAS
// ============================================
const borderClasses = [
    // Border Radius
    'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',

    // Border Width
    'border', 'border-0', 'border-2', 'border-4',
    'border-t', 'border-b', 'border-l', 'border-r',

    // Border Color
    'border-slate-200', 'border-slate-300', 'border-slate-700',
    'border-emerald-500', 'border-teal-500', 'border-blue-500',
    'border-white/10', 'border-white/20',

    // Shadow
    'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',

    // Effects
    'backdrop-blur-sm', 'backdrop-blur-md', 'backdrop-blur-lg',
];

// ============================================
// CLASSES DE TIPOGRAFIA
// ============================================
const typographyClasses = [
    // Font Size
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
    'md:text-xl', 'md:text-2xl', 'md:text-3xl', 'md:text-4xl',

    // Font Weight
    'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',

    // Text Alignment
    'text-left', 'text-center', 'text-right',

    // Text Style
    'uppercase', 'lowercase', 'capitalize', 'italic', 'underline', 'line-through',

    // Line Height
    'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
];

// ============================================
// CLASSES DE TAMANHO
// ============================================
const sizeClasses = [
    // Width
    'w-full', 'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
    'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-12', 'w-16',
    'max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-4xl', 'max-w-6xl', 'max-w-7xl',

    // Height
    'h-auto', 'h-full', 'h-screen',
    'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12', 'h-16',
    'min-h-screen', 'min-h-[80vh]', 'max-h-[90vh]',
];

// ============================================
// CLASSES DE INTERATIVIDADE
// ============================================
const interactiveClasses = [
    'cursor-pointer', 'cursor-not-allowed',
    'hover:bg-emerald-50', 'hover:bg-teal-50', 'hover:bg-blue-50', 'hover:bg-slate-100', 'hover:bg-red-100',
    'hover:text-emerald-600', 'hover:text-blue-600', 'hover:text-white',
    'hover:scale-105', 'hover:scale-110',
    'transition', 'transition-all', 'transition-colors', 'transition-transform',
    'duration-200', 'duration-300',
    'opacity-50', 'opacity-60', 'opacity-80', 'opacity-100',
    'disabled:opacity-50', 'disabled:cursor-not-allowed',
];

// ============================================
// CLASSES DE POSICIONAMENTO
// ============================================
const positionClasses = [
    'relative', 'absolute', 'fixed', 'sticky',
    'inset-0', 'top-0', 'bottom-0', 'left-0', 'right-0',
    'top-4', 'right-4', 'bottom-4', 'left-4',
    '-top-2', '-right-2', '-bottom-2', '-left-2',
    'z-10', 'z-20', 'z-50', 'z-[100]', 'z-[110]', 'z-[200]',
];

// ============================================
// CLASSES DE OVERFLOW E SCROLL
// ============================================
const overflowClasses = [
    'overflow-hidden', 'overflow-auto', 'overflow-x-hidden', 'overflow-y-auto',
    'overflow-visible', 'overflow-scroll',
];

// Export para o Tailwind detectar
export const safelist = [
    ...bgClasses,
    ...textClasses,
    ...layoutClasses,
    ...spacingClasses,
    ...borderClasses,
    ...typographyClasses,
    ...sizeClasses,
    ...interactiveClasses,
    ...positionClasses,
    ...overflowClasses,
];
