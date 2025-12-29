import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Calendar, Users, DollarSign, TrendingUp, 
  Clock, CheckCircle2, AlertCircle, Plus,
  ChevronRight, Sparkles, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const plano = user?.plano || 'gratuito';
  const mesAtual = format(new Date(), 'yyyy-MM');

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-dashboard'],
    queryFn: () => base44.entities.Agendamento.list('-data', 100),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-count'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const { data: transacoes = [] } = useQuery({
    queryKey: ['transacoes-dashboard'],
    queryFn: () => base44.entities.Transacao.list('-data', 100),
    enabled: plano === 'premium',
  });

  // Cálculos
  const agendamentosHoje = agendamentos.filter(a => 
    a.data === format(new Date(), 'yyyy-MM-dd') && a.status !== 'cancelado'
  );

  const agendamentosMes = agendamentos.filter(a => 
    a.data?.startsWith(mesAtual)
  );

  const agendamentosLimiteMes = user?.mes_referencia === mesAtual 
    ? (user?.agendamentos_mes || 0) 
    : agendamentosMes.length;

  const limiteAgendamentos = plano === 'gratuito' ? 10 : Infinity;
  const progressoAgendamentos = plano === 'gratuito' 
    ? (agendamentosLimiteMes / limiteAgendamentos) * 100 
    : 0;

  const receitaMes = plano === 'premium' 
    ? transacoes
        .filter(t => t.tipo === 'receita' && t.data?.startsWith(mesAtual))
        .reduce((sum, t) => sum + (t.valor || 0), 0)
    : agendamentosMes
        .filter(a => a.status === 'concluido')
        .reduce((sum, a) => sum + (a.valor || 0), 0);

  const statusColors = {
    agendado: 'bg-blue-100 text-blue-700',
    confirmado: 'bg-green-100 text-green-700',
    concluido: 'bg-slate-100 text-slate-700',
    cancelado: 'bg-red-100 text-red-700'
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Olá, {user?.full_name?.split(' ')[0] || 'Profissional'}! 👋
            </h1>
            <p className="text-slate-500 mt-1">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Link to={createPageUrl('Agenda')}>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
              <Plus className="w-5 h-5 mr-2" />
              Novo Agendamento
            </Button>
          </Link>
        </motion.div>

        {/* Alerta limite - Plano Gratuito */}
        {plano === 'gratuito' && progressoAgendamentos >= 80 && (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      {agendamentosLimiteMes >= 10 
                        ? 'Limite de agendamentos atingido!' 
                        : 'Você está chegando no limite de agendamentos'}
                    </p>
                    <p className="text-sm text-amber-600">
                      {agendamentosLimiteMes}/10 agendamentos este mês
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl('Planos')}>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Crown className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Hoje</p>
                  <p className="text-3xl font-bold text-slate-800">{agendamentosHoje.length}</p>
                  <p className="text-sm text-slate-500 mt-1">agendamentos</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Este mês</p>
                  <p className="text-3xl font-bold text-slate-800">{agendamentosMes.length}</p>
                  <p className="text-sm text-slate-500 mt-1">agendamentos</p>
                </div>
                <div className="p-3 bg-violet-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-violet-600" />
                </div>
              </div>
              {plano === 'gratuito' && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Limite mensal</span>
                    <span>{agendamentosLimiteMes}/10</span>
                  </div>
                  <Progress value={progressoAgendamentos} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Clientes</p>
                  <p className="text-3xl font-bold text-slate-800">{clientes.length}</p>
                  <p className="text-sm text-slate-500 mt-1">cadastrados</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Receita do mês</p>
                  <p className="text-3xl font-bold text-slate-800">
                    R$ {receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {plano !== 'premium' && (
                    <p className="text-xs text-slate-400 mt-1">Baseado em agendamentos concluídos</p>
                  )}
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agendamentos de Hoje */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Agendamentos de Hoje</CardTitle>
              <Link to={createPageUrl('Agenda')}>
                <Button variant="ghost" className="text-violet-600 hover:text-violet-700">
                  Ver todos
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {agendamentosHoje.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500">Nenhum agendamento para hoje</p>
                  <Link to={createPageUrl('Agenda')}>
                    <Button className="mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar agendamento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamentosHoje.map((agendamento) => (
                    <div 
                      key={agendamento.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-sm">
                        <Clock className="w-6 h-6 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {agendamento.cliente_nome}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {agendamento.servico_nome}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-800">{agendamento.horario}</p>
                        <Badge className={statusColors[agendamento.status]}>
                          {agendamento.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Upgrade - Para planos não premium */}
        {plano !== 'premium' && (
          <motion.div variants={itemVariants}>
            <Card className="bg-gradient-to-r from-violet-600 to-purple-600 text-white overflow-hidden relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute left-1/2 bottom-0 w-48 h-48 bg-white/10 rounded-full -mb-24" />
              <CardContent className="p-8 relative">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 rounded-2xl">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">
                        {plano === 'gratuito' ? 'Desbloqueie mais recursos!' : 'Seja Premium!'}
                      </h3>
                      <p className="text-white/80 mt-1">
                        {plano === 'gratuito' 
                          ? 'Faça upgrade para ter agendamentos ilimitados e muito mais' 
                          : 'Tenha acesso ao controle financeiro completo e relatórios'}
                      </p>
                    </div>
                  </div>
                  <Link to={createPageUrl('Planos')}>
                    <Button className="bg-white text-violet-600 hover:bg-white/90 px-8 py-6 text-lg">
                      <Crown className="w-5 h-5 mr-2" />
                      Ver Planos
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
