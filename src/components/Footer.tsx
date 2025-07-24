
export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-3 py-2 rounded-lg font-bold text-xl mr-2">
              RM
            </div>
            <span className="text-xl font-semibold">Soluções</span>
          </div>
          
          <p className="text-gray-400 mb-4">
            Serralheria • Automação • Caldeiraria Agrícola
          </p>
          
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
