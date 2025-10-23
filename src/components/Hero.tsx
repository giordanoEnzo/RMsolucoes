
import { Button } from "./ui/button";
import { ArrowRight, Wrench, Cog, Zap } from "lucide-react";

export const Hero = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900">
        <div className="absolute inset-0 bg-black/30"></div>
        {/* Geometric shapes for modern look */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-teal-500/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-cyan-500/10 rounded-full blur-lg"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            RM <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">SOLUÇÕES</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-200 mb-4 max-w-3xl mx-auto">
            Serralheria - Automação - Caldeiraria Agrícola
          </p>
          
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Sinônimo de qualidade e confiança há mais de 15 anos
          </p>

          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <Wrench className="w-5 h-5 text-emerald-400 mr-2" />
              <span className="text-white font-medium">Serralheria</span>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <Zap className="w-5 h-5 text-teal-400 mr-2" />
              <span className="text-white font-medium">Automação</span>
            </div>
            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
              <Cog className="w-5 h-5 text-cyan-400 mr-2" />
              <span className="text-white font-medium">Caldeiraria</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-3 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => scrollToSection('servicos')}
            >
              Nossos Serviços
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-white/30 text-black hover:bg-[#374C36]/10 px-8 py-3 text-lg font-semibold rounded-full backdrop-blur-sm transition-all duration-300"
              onClick={() => scrollToSection('contato')}
            >
              Entre em Contato
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};
