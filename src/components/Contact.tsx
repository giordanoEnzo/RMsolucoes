
import { Phone, Mail, MapPin, Clock, Facebook, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Contact = () => {
  return (
    <section id="contato" className="py-20 bg-gradient-to-br from-gray-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Entre em <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Contato</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            É simples falar com a RM Soluções
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Phone 1 */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Telefone</h3>
              <p className="text-emerald-400 text-lg font-medium">+55 19 99692-4173</p>
            </CardContent>
          </Card>

          {/* Phone 2 */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Telefone</h3>
              <p className="text-emerald-400 text-lg font-medium">+55 19 99617-3421</p>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all duration-300 group">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email</h3>
              <p className="text-emerald-400 text-lg font-medium">contato@rmsolucoes.com.br</p>
            </CardContent>
          </Card>
        </div>

        {/* Map Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Nossa Localização</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Endereço</p>
                    <p className="text-gray-300">Av. Ângelo Franzini, 2438 - Res. Bosque de Versalles, Araras - SP, 13609-390</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-6 h-6 text-emerald-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Horário de Funcionamento</p>
                    <p className="text-gray-300">Segunda a Sexta: 8h às 18h</p>
                    <p className="text-gray-300">Sábado: 8h às 12h</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-full px-8"
                >
                  Veja nosso portfólio de imagens
                </Button>
              </div>
            </div>
            
            <div className="aspect-video bg-emerald-900/50 rounded-xl flex flex-col items-center justify-center p-4">
              <iframe
                title="Localização RM Soluções"
                src="https://www.google.com/maps?q=Av+Ângelo+Franzini+2438,+Res+Bosque+de+Versalles,+Araras+SP&output=embed"
                className="w-full h-full rounded-xl"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
  
            </div>


          </div>
        </div>

        {/* Social Media */}
        <div className="text-center mt-12">
          <p className="text-gray-300 mb-4">Siga-nos nas redes sociais</p>
          <div className="flex justify-center space-x-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors cursor-pointer">
              <Facebook className="w-6 h-6 text-white" />
            </div>
            <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors cursor-pointer">
              <Instagram className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
