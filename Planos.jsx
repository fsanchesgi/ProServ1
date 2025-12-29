import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Calendar, Users, FileText, CreditCard, Bell, History, BarChart3, Headphones } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Planos() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    loadUser();
    
    // Verificar sucesso de pagamento
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const plano = urlParams.get('plano');
    
    if (paymentStatus === 'success' && plano) {
      handleAtualizarPlano(plano);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const planoAtual = user?.plano || 'gratuito';

  const handleAtualizarPlano = async (novoPlano) => {
    try {
      await base44.auth.updateMe({ plano: novoPlano });
      toast.success(`Bem-vindo ao Plano ${novoPlano.charAt(0).toUpperCase() + novoPlano.slice(1)}!`);
      setUser({ ...user, plano: novoPlano });
    } catch (error) {
      toast.error('Erro ao atualizar plano');
    }
  };

  const handleSelectPlano = async (novoPlano) => {
    if (novoPlano === planoAtual) return;
    
    // Se for gratuito, apenas downgrade direto
    if (novoPlano === 'gratuito') {
      setLoading(novoPlano);
      try {
        await base44.auth.updateMe({ plano: novoPlano });
        toast.success(`Plano alterado para Gratuito`);
        setUser({ ...user, plano: novoPlano });
      } catch (error) {
        toast.error('Erro ao alterar plano');
      } finally {
        setLoading(null);
      }
      return;
    }
    
    // Para planos pagos, iniciar pagamento
    setLoading(novoPlano);
    
    try {
      const { init_point } = await base44.functions.criarPagamentoMercadoPago({
        plano: novoPlano,
        user_email: user.email,
        user_name: user.full_name
      });
      
      // Redirecionar para checkout do Mercado Pago
      window.location.href = init_point;
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar pagamento. Verifique se Backend Functions está ativado.');
      setLoading(null);
    }
  };

  const planos = [
    {
      id: 'gratuito',
      nome: 'Gratuito',
      descricao: 'Até 10 agendamentos/mês',
      preco: 0,
      recursos: [
        { icon: Calendar, texto: 'Agenda básica' },
        { icon: Users, texto: 'Cadastro de clientes' },
        { icon: FileText, texto: 'Cadastro de serviços' },
        { icon: History, texto: 'Limite de 10 agendamentos' },
      ],
      cor: 'slate',
      destaque: false
    },
    {
      id: 'basico',
      nome: 'Básico',
      descricao: 'Agendamentos ilimitados',
      preco: 29.90,
      recursos: [
        { icon: Calendar, texto: 'Agendamentos ilimitados' },
        { icon: BarChart3, texto: 'Dashboard completo' },
        { icon: Bell, texto: 'Notificações' },
        { icon: History, texto: 'Histórico de atendimentos' },
      ],
      cor: 'blue',
      destaque: false
    },
    {
      id: 'premium',
      nome: 'Premium',
      descricao: 'Todos os recursos avançados',
      preco: 49.90,
      recursos: [
        { icon: Check, texto: 'Todos os recursos do Básico' },
        { icon: CreditCard, texto: 'Integração com pagamentos' },
        { icon: BarChart3, texto: 'Relatórios detalhados' },
        { icon: FileText, texto: 'Controle financeiro' },
        { icon: Headphones, texto: 'Suporte prioritário' },
      ],
      cor: 'violet',
      destaque: true
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 p-6 lg:p-8">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Planos feitos para o seu crescimento
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio e evolua conforme sua empresa cresce.
          </p>
        </motion.div>

        {/* Planos Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {planos.map((plano) => {
            const isAtual = planoAtual === plano.id;
            const isDowngrade = 
              (planoAtual === 'premium' && plano.id !== 'premium') ||
              (planoAtual === 'basico' && plano.id === 'gratuito');
            
            return (
              <motion.div key={plano.id} variants={itemVariants}>
                <Card className={cn(
                  "relative h-full transition-all duration-300 hover:scale-[1.02]",
                  plano.destaque 
                    ? "border-2 border-violet-500 shadow-xl shadow-violet-500/20" 
                    : "border-slate-200"
                )}>
                  {plano.destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-4 py-1">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Mais completo
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-slate-800">
                      {plano.nome}
                    </CardTitle>
                    <p className="text-slate-500">{plano.descricao}</p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Preço */}
                    <div className="text-center">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-slate-800">
                          R$ {plano.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-slate-500">/ mês</span>
                      </div>
                    </div>

                    {/* Recursos */}
                    <ul className="space-y-3">
                      {plano.recursos.map((recurso, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            plano.destaque ? "bg-violet-100" : "bg-slate-100"
                          )}>
                            <Check className={cn(
                              "w-4 h-4",
                              plano.destaque ? "text-violet-600" : "text-slate-600"
                            )} />
                          </div>
                          <span className="text-slate-600">{recurso.texto}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Botão */}
                    <Button
                      onClick={() => handleSelectPlano(plano.id)}
                      disabled={isAtual || loading === plano.id}
                      className={cn(
                        "w-full py-6 text-lg transition-all",
                        isAtual 
                          ? "bg-slate-100 text-slate-500 cursor-default"
                          : plano.destaque
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                      )}
                    >
                      {loading === plano.id ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : isAtual ? (
                        'Plano atual'
                      ) : isDowngrade ? (
                        'Fazer downgrade'
                      ) : (
                        <>
                          {plano.id === 'premium' && <Crown className="w-5 h-5 mr-2" />}
                          Assinar {plano.nome}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ ou Info adicional */}
        <motion.div variants={itemVariants} className="mt-16 text-center">
          <p className="text-slate-400">
            Dúvidas? Entre em contato com nosso suporte.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
