import { useState } from "react";
import { Menu, X, Facebook, Instagram, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom"; // IMPORTANTE
import logo from '@/assets/logo.png'; // ou '../assets/logo.png' dependendo da estrutura

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate(); // Hook de navegação

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  const goToLogin = () => {
    navigate('/login');
    setIsOpen(false); // fecha menu mobile se estiver aberto
  };

  return (
    <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src={logo}
              alt="Logo"
              className="h-25 w-20 rounded-lg object-cover"
            />
            
          </div>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('home')} className="text-gray-700 hover:text-emerald-600 font-medium">
              Inicio
            </button>
            <button onClick={() => scrollToSection('empresa')} className="text-gray-700 hover:text-emerald-600 font-medium">
              Empresa
            </button>
            <button onClick={() => scrollToSection('servicos')} className="text-gray-700 hover:text-emerald-600 font-medium">
              Serviços
            </button>
            <button onClick={() => scrollToSection('imagens')} className="text-gray-700 hover:text-emerald-600 font-medium">
              Imagens
            </button>
            <button onClick={() => scrollToSection('contato')} className="text-gray-700 hover:text-emerald-600 font-medium">
              Contato
            </button>

            {/* Botão de Login */}
            <Button onClick={goToLogin} variant="outline" className="text-sm flex items-center gap-2">
              <LogIn size={16} /> Área Cliente
            </Button>

            {/* Social Icons */}
            <div className="flex items-center space-x-3">
              <Facebook className="w-5 h-5 text-gray-600 hover:text-blue-600 cursor-pointer" />
              <Instagram className="w-5 h-5 text-gray-600 hover:text-pink-600 cursor-pointer" />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <button onClick={() => scrollToSection('home')} className="block px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium w-full text-left">
              Inicio
            </button>
            <button onClick={() => scrollToSection('empresa')} className="block px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium w-full text-left">
              Empresa
            </button>
            <button onClick={() => scrollToSection('servicos')} className="block px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium w-full text-left">
              Serviços
            </button>
            <button onClick={() => scrollToSection('imagens')} className="block px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium w-full text-left">
              Imagens
            </button>
            <button onClick={() => scrollToSection('contato')} className="block px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium w-full text-left">
              Contato
            </button>

            

            {/* Botão de login no mobile */}
            <button onClick={goToLogin} className="block w-full text-left px-3 py-2 text-gray-700 hover:text-emerald-600 font-medium">
              <div className="flex items-center gap-2">
                <LogIn size={18} />
                  Login
              </div>
            </button>

            <div className="flex justify-center space-x-4 pt-4">
              <Facebook className="w-6 h-6 text-gray-600 hover:text-blue-600 cursor-pointer" />
              <Instagram className="w-6 h-6 text-gray-600 hover:text-pink-600 cursor-pointer" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
