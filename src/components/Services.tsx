
import { Wrench, Zap, Cog, Shield, Settings, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Services = () => {
  const services = [
    {
      category: "Serralheria",
      icon: Wrench,
      gradient: "from-red-500 to-orange-500",
      services: [
        {
          title: "Portas e Portões Metálicos",
          description: "Fabricamos e instalamos as portas para sua residência, comércio ou indústria. Portões com design aberto ou fechado no acabamento impecável."
        },
        {
          title: "Estrutura Metálica",
          description: "Fabricação e montagem de estruturas residenciais, comerciais, industriais e especiais."
        },
        {
          title: "Esquadrias Metálicas",
          description: "Nossas esquadrias são fabricadas para oferecer o máximo em segurança e durabilidade."
        }
      ]
    },
    {
      category: "Automação",
      icon: Zap,
      gradient: "from-emerald-500 to-teal-500",
      services: [
        {
          title: "Portaria de Condomínio",
          description: "Portarias automatizadas para condomínios, comércios e indústrias."
        },
        {
          title: "Portões Metálicos",
          description: "Automação em portões residenciais, comerciais, industriais e especiais."
        }
      ]
    }
  ];

  return (
    <section id="servicos" className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nossos <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Serviços</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Prestação de serviços e produtos com a mais alta qualidade
          </p>
        </div>

        <div className="space-y-16">
          {services.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-8">
              <div className="text-center">
                <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${category.gradient} text-white font-semibold text-lg shadow-lg`}>
                  <category.icon className="w-6 h-6 mr-2" />
                  Serviços de {category.category}
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.services.map((service, serviceIndex) => (
                  <Card key={serviceIndex} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-2">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${category.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {service.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {service.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Services Grid */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Alguns de nossos serviços
            </h3>
            <p className="text-lg text-gray-600">
              Clique nas imagens para maiores informações
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "Caldeiraria Agrícola", icon: Cog },
              { name: "Caldeiraria Agrícola Diversos", icon: Settings },
              { name: "Serralheria", icon: Wrench },
              { name: "Portaria / Automação", icon: Home },
              { name: "Condomínios e Edifícios", icon: Shield },
              { name: "Torno e Corte", icon: Cog }
            ].map((item, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="aspect-square bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center p-4 hover:-translate-y-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 text-center leading-tight">
                    {item.name}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
