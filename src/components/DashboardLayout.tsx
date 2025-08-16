import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Home, BarChart, Settings, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/channels', label: 'Channels', icon: MessageCircle },
    { href: '/insights', label: 'Insights', icon: BarChart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const renderNavigation = (mobile = false) => (
    <nav className={cn(
      'bg-white/90 backdrop-blur-md shadow-sm transition-all duration-300',
      mobile ? 'fixed z-50 top-0 left-0 right-0 bg-white/95' : 'h-full w-64 border-r'
    )}>
      <div className={cn(
        'flex flex-col space-y-2 p-4',
        mobile ? 'pt-20' : ''
      )}>
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              'flex items-center space-x-3 p-3 rounded-lg transition-all duration-200',
              'hover:bg-purple-100 text-gray-700 hover:text-primary',
              'focus:outline-none focus:ring-2 focus:ring-primary/50'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-primary">Pulse</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute top-0 left-0 w-64 h-full bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {renderNavigation(true)}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        {renderNavigation()}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 mt-16 md:mt-0 p-6 bg-background overflow-y-auto">
        {children}
      </main>
    </div>
  );
};