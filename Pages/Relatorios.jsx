import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  FileText, Calendar, Users, DollarSign, TrendingUp,
  Download, BarChart3, PieChart, Clock, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';

export default function Relatorios() {
  const [user, setUser] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const plano = user?.plano || 'gratuito';

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-relatorios'],
    queryFn: () => base44.entities.Agendamento.list('-data', 1000),
    enabled: plano === 'premium',
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-relatorios'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: plano === 'premium',
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos-relatorios'],
    queryFn: () => base44.entities.Servico.list(),
    enabled: plano === 'premium',
  });

  const { data: transacoes = [] } = useQuery({
    queryKey: ['transacoes-relatorios'],
    queryFn: () => base44.entities.Transacao.list('-data', 1000),
    enabled: plano === 'premium',
  });

  // Filtrar por período
  const agendamentosPeriodo = agendamentos.filter(a => 
    a.data >= dataInicio && a.data <= dataFim
  );

  const transacoesPeriodo = transacoes.filter(t => 
    t.data >= dataInicio && t.data <= dataFim
  );

  // Métricas principais
  const totalAgendamentos = agendamentosPeriodo.length;
  const agendamentosConcluidos = agendamentosPeriodo.filter(a => a.status === 'concluido').length;
  const taxaConclusao = totalAgendamentos > 0 ? ((agendamentosConcluidos / totalAgendamentos) * 100).toFixed(1) : 0;
  
  const receitaTotal = transacoesPeriodo
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (t.valor || 0), 0);
  
  const despesaTotal = transacoesPeriodo
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const ticketMedio = agendamentosConcluidos > 0 
    ? agendamentosPeriodo
        .filter(a => a.status === 'concluido')
        .reduce((sum, a) => sum + (a.valor || 0), 0) / agendamentosConcluidos
    : 0;

  // Agendamentos por dia da semana
  const agendamentosPorDia = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  agendamentosPeriodo.forEach(a => {
    if (a.data) {
      const dia = new Date(a.data).getDay();
      agendamentosPorDia[dia]++;
    }
  });

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const chartDiasSemana = diasSemana.map((dia, i) => ({
    dia,
    agendamentos: agendamentosPorDia[i]
  }));

  // Serviços mais realizados
  const servicosCount = {};
  agendamentosPeriodo.forEach(a => {
    if (a.servico_nome) {
      servicosCount[a.servico_nome] = (servicosCount[a.servico_nome] || 0) + 1;
    }
  });

  const topServicos = Object.entries(servicosCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([nome, count]) => ({ nome, count }));

  // Evolução mensal
  const evolucaoMensal = [];
  for (let i = 5; i >= 0; i--) {
    const mes = subMonths(new Date(), i);
    const mesKey = format(mes, 'yyyy-MM');
    const mesAgendamentos = agendamentos.filter(a => a.data?.startsWith(mesKey));
    const mesTransacoes = transacoes.filter(t => t.data?.startsWith(mesKey));
    
    evolucaoMensal.push({
      mes: format(mes, 'MMM', { locale: ptBR }),
      agendamentos: mesAgendamentos.length,
      receita: mesTransacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0)
    });
  }

  // Status dos agendamentos
  const statusCount = { agendado: 0, confirmado: 0, concluido: 0, cancelado: 0 };
  agendamentosPeriodo.forEach(a => {
    if (a.status) statusCount[a.status]++;
  });

  const statusData = Object.entries(statusCount).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count
  }));

  const COLORS = ['#3b82f6', '#22c55e', '#64748b', '#ef4444'];

  const handleChangePeriodo = (value) => {
    setPeriodo(value);
    const hoje = new Date();
    
    switch (value) {
      case 'semana':
        setDataInicio(format(subMonths(hoje, 0), 'yyyy-MM-dd'));
        setDataFim(format(hoje, 'yyyy-MM-dd'));
        break;
      case 'mes':
        setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
        break;
      case 'trimestre':
        setDataInicio(format(subMonths(hoje, 3), 'yyyy-MM-dd'));
        setDataFim(format(hoje, 'yyyy-MM-dd'));
        break;
      case 'ano':
        setDataInicio(format(subMonths(hoje, 12), 'yyyy-MM-dd'));
        setDataFim(format(hoje, 'yyyy-MM-dd'));
        break;
      default:
        break;
    }
  };

  if (plano !== 'premium') {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-lg mx-auto mt-20">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Recurso Premium</h2>
            <p className="text-slate-500 mb-6">
              Os relatórios detalhados estão disponíveis apenas para assinantes do plano Premium.
            </p>
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600">
              Fazer Upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
            <p className="text-slate-500 mt-1">
              Análise detalhada do seu negócio
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <Select value={periodo} onValueChange={handleChangePeriodo}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana">Esta semana</SelectItem>
                    <SelectItem value="mes">Este mês</SelectItem>
                    <SelectItem value="trimestre">Último trimestre</SelectItem>
                    <SelectItem value="ano">Último ano</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {periodo === 'personalizado' && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-500">De:</Label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-500">Até:</Label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Agendamentos</p>
                  <p className="text-2xl font-bold text-slate-800">{totalAgendamentos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold text-slate-800">{taxaConclusao}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receita Total</p>
                  <p className="text-2xl font-bold text-slate-800">
                    R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ticket Médio</p>
                  <p className="text-2xl font-bold text-slate-800">
                    R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Evolução Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" stroke="#94a3b8" />
                    <YAxis yAxisId="left" stroke="#8b5cf6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="agendamentos" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                      name="Agendamentos"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                      name="Receita (R$)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Agendamentos por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Dia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDiasSemana}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="agendamentos" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status dos Agendamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Serviços Mais Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              {topServicos.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-slate-400">
                  Nenhum dado disponível
                </div>
              ) : (
                <div className="space-y-4">
                  {topServicos.map((servico, index) => (
                    <div key={servico.nome} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm",
                          index === 0 ? "bg-yellow-500" :
                          index === 1 ? "bg-slate-400" :
                          index === 2 ? "bg-amber-600" : "bg-slate-300"
                        )}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-slate-700">{servico.nome}</span>
                      </div>
                      <Badge variant="secondary">
                        {servico.count} atendimentos
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
