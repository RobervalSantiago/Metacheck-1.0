import React, { useState, useId, KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CardAction {
  icon?: React.ElementType;
  label?: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'ghost' | 'primary' | 'danger';
}

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode; // Legacy generic slot
  actions?: CardAction[]; // New configurable actions array
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  children, 
  className = '', 
  action, 
  actions,
  collapsible = false, 
  defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const headerId = useId();

  const toggle = () => {
    if (collapsible) setIsOpen(!isOpen);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault(); // Evita scroll da página ao usar Espaço
      toggle();
    }
  };

  const getActionStyles = (variant: CardAction['variant'] = 'ghost') => {
    switch (variant) {
      case 'primary':
        return 'text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20';
      case 'danger':
        return 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20';
      default: // ghost
        return 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all duration-200 ${className}`}>
      {(title || action || actions || collapsible) && (
        <div 
          role={collapsible ? "button" : undefined}
          tabIndex={collapsible ? 0 : undefined}
          aria-expanded={collapsible ? isOpen : undefined}
          aria-controls={collapsible ? contentId : undefined}
          aria-labelledby={headerId}
          onClick={collapsible ? toggle : undefined}
          onKeyDown={handleKeyDown}
          className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center outline-none ${
            collapsible 
              ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:ring-2 focus:ring-inset focus:ring-brand-500' 
              : ''
          }`}
        >
          <div className="flex items-center gap-2 flex-1" id={headerId}>
            {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Render Configurable Actions */}
            {actions && actions.length > 0 && (
              <div 
                className="flex items-center gap-1 mr-2"
                onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => e.stopPropagation()}
              >
                {actions.map((act, idx) => (
                  <button
                    key={idx}
                    onClick={act.onClick}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${getActionStyles(act.variant)} ${act.className || ''}`}
                    title={act.label}
                  >
                    {act.icon && <act.icon size={18} />}
                    {act.label && <span className="text-xs font-bold">{act.label}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Legacy Action Slot */}
            {action && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                onKeyDown={(e) => e.stopPropagation()}
              >
                {action}
              </div>
            )}

            {/* Collapsible Icon */}
            {collapsible && (
              <ChevronDown 
                size={20} 
                className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true" 
              />
            )}
          </div>
        </div>
      )}
      
      <div 
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          collapsible 
            ? (isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 invisible') 
            : ''
        }`}
      >
        <div className="p-6 text-slate-900 dark:text-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
};
