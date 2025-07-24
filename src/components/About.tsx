
import { CheckCircle, Award, Users, Calendar } from "lucide-react";

export const About = () => {
  return (
    <section id="empresa" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Uma História de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Sucesso</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Há mais de 15 anos trabalhando com transparência e dedicação
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="prose prose-lg text-gray-700">
              <p className="text-lg leading-relaxed">
                A RM Soluções é uma empresa que atua no mercado há mais de 15 anos. 
                Durante esse tempo se firmou como uma das importantes empresas do 
                setor na nossa região. Estabelecida na cidade de Araras, a RM Soluções 
                superou desafios, passou por transformações e crescimentos, fruto de 
                uma filosofia empresarial dinâmica que se moderniza continuamente e 
                que prioriza o trabalho, os resultados e o desenvolvimento dos negócios.
              </p>
              
              <p className="text-lg leading-relaxed">
                Contamos com uma equipe de experientes apurada e com elevado 
                padrão de capacitação técnica, o que reflete diretamente nos resultados 
                positivos da empresa e de seus clientes.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Tradição e Competência</h3>
                  <p className="text-gray-600 text-sm">
                    Equipe qualificada e talentosa com direção ética
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Award className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Nosso Compromisso</h3>
                  <p className="text-gray-600 text-sm">
                    Prestação de serviços com máxima qualidade
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Users className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Equipe Especializada</h3>
                  <p className="text-gray-600 text-sm">
                    Profissionais capacitados e experientes
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Mais de 15 Anos</h3>
                  <p className="text-gray-600 text-sm">
                    Experiência consolidada no mercado
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl p-8 shadow-2xl">
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-4">15+</div>
                  <div className="text-xl font-semibold mb-2">Anos de</div>
                  <div className="text-xl font-semibold">Experiência</div>
                </div>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-500/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
