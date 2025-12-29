import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  Calendar, Users, Briefcase, LayoutDashboard, 
  CreditCard, FileText, Settings, Menu, X, 
  LogOut, ChevronRight, Crown, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {
      // Usuário não logado
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const plano = user?.plano || 'gratuito';

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', planos: ['gratuito', 'basico', 'premium'] },
    { name: 'Agenda', icon: Calendar, page: 'Agenda', planos: ['gratuito', 'basico', 'premium'] },
    { name: 'Clientes', icon: Users, page: 'Clientes', planos: ['gratuito', 'basico', 'premium'] },
    { name: 'Serviços', icon: Briefcase, page: 'Servicos', planos: ['gratuito', 'basico', 'premium'] },
    { name: 'Financeiro', icon: CreditCard, page: 'Financeiro', planos: ['premium'] },
    { name: 'Relatórios', icon: FileText, page: 'Relatorios', planos: ['premium'] },
    { name: 'Planos', icon: Crown, page: 'Planos', planos: ['gratuito', 'basico', 'premium'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.planos.includes(plano));

  const planoBadge = {
    gratuito: { label: 'Gratuito', color: 'bg-slate-500' },
    basico: { label: 'Básico', color: 'bg-blue-500' },
    premium: { label: 'Premium', color: 'bg-violet-500' }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <img 
            src="https://raw.githubusercontent.com/fsanchesgi/ProServ/refs/heads/main/images/logo.png" 
            alt="ProServ Logo"
            className="w-24 h-24 object-contain mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">ProServ</h1>
          <p className="text-slate-500 mb-8">Sistema de Agendamentos Profissional</p>
          <Button 
            onClick={() => base44.auth.redirectToLogin()}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-6 text-lg rounded-xl"
          >
            Entrar no Sistema
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://raw.githubusercontent.com/fsanchesgi/ProServ/refs/heads/main/images/logo.png" 
              alt="ProServ Logo"
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-slate-800">ProServ</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <>
            {/* Overlay mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            
            <motion.aside 
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 z-50 lg:z-30 flex flex-col"
            >
              {/* Logo */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <img 
                    src="https://raw.githubusercontent.com/fsanchesgi/ProServ/refs/heads/main/images/logo.png" 
                    alt="ProServ Logo"
                    className="w-12 h-12 object-contain"
                  />
                  <div>
                    <h1 className="font-bold text-white text-xl">ProServ</h1>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full text-white",
                      planoBadge[plano].color
                    )}>
                      {planoBadge[plano].label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredMenuItems.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25" 
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                      {item.page === 'Planos' && plano === 'gratuito' && (
                        <Sparkles className="w-4 h-4 ml-auto text-yellow-400" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User Info */}
              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.full_name || 'Usuário'}</p>
                    <p className="text-slate-400 text-sm truncate">{user.email}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
