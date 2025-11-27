import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from path if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;
    
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({
        label,
        path: index === paths.length - 1 ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={item.path || item.label}>
          {index === 0 && (
            <Link to="/" className="text-gray-400 hover:text-amber-400 transition-colors">
              <Home size={16} />
            </Link>
          )}
          {index > 0 && (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          {item.path ? (
            <Link
              to={item.path}
              className="text-gray-400 hover:text-amber-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-amber-400 font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;

