import xbertogna from '@/assets/xbertogna.png';
import logo from '@/assets/logo.png';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Logo principal */}
          <div className="flex items-center justify-center mb-4">
            <img
              src={logo}
              alt="Logo"
              className="h-24 w-20 rounded-lg object-cover"
            />
          </div>

          {/* Descrição */}
          <p className="text-gray-400 mb-4">
            Serralheria • Automação • Caldeiraria Agrícola
          </p>

          {/* Direitos autorais */}
          <div className="border-t border-gray-800 pt-6">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} RM Soluções - Todos os direitos reservados 
            </p>
          </div>

          
          
        </div>
      </div>
    </footer>
  );
};
