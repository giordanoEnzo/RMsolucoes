
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Button } from "./ui/button";

export const Gallery = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = useState("TODOS");

  const categories = [
    "TODOS",
    "CALDEIRARIA AGRÍCOLA", 
    "CALDEIRARIA AGRÍCOLA DIVERSOS",
    "SERRALHERIA",
    "PORTARIA / AUTOMAÇÃO",
    "CONDOMÍNIOS E EDIFÍCIOS",
    "TORNO E CORTE"
  ];

  // Placeholder images - in a real implementation, these would be actual project images
  const images = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1],
    url: `https://images.unsplash.com/photo-${1500000000000 + i * 10000000}-${Math.random().toString(36).substr(2, 9)}?w=400&h=400&fit=crop`,
    alt: `Projeto ${i + 1}`
  }));

  const filteredImages = currentCategory === "TODOS" 
    ? images 
    : images.filter(img => img.category === currentCategory);

  const openModal = (index: number) => {
    setSelectedImage(index);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    const newIndex = direction === 'prev' 
      ? (selectedImage - 1 + filteredImages.length) % filteredImages.length
      : (selectedImage + 1) % filteredImages.length;
    
    setSelectedImage(newIndex);
  };

  return (
    <section id="imagens" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nosso <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Portfólio</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Algumas imagens de nossos serviços
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories.map((category) => (
            <Button
              key={category}
              variant={currentCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentCategory(category)}
              className={`text-xs font-medium transition-all duration-300 ${
                currentCategory === category
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image, index) => (
            <div
              key={image.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
              onClick={() => openModal(index)}
            >
              <div className="w-full h-full bg-gradient-to-br from-emerald-200 to-teal-200 flex items-center justify-center">
                <div className="text-gray-600 text-center">
                  <ZoomIn className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm font-medium">{image.alt}</div>
                  <div className="text-xs text-gray-500 mt-1">{image.category}</div>
                </div>
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white" />
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {selectedImage !== null && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-full">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 z-10 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={closeModal}
              >
                <X className="w-4 h-4" />
              </Button>
              
              <div className="bg-gradient-to-br from-emerald-300 to-teal-300 rounded-lg p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-gray-800">
                  <div className="text-6xl mb-4">🏗️</div>
                  <h3 className="text-2xl font-bold mb-2">
                    {filteredImages[selectedImage].alt}
                  </h3>
                  <p className="text-lg">
                    {filteredImages[selectedImage].category}
                  </p>
                </div>
              </div>
              
              {/* Navigation */}
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigateImage('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => navigateImage('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
