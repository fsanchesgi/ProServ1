import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Shield, Users, Calendar, DollarSign, TrendingUp,
  Crown, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const { data: usuarios = [] } = useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: () => base44.entities.User.list('full_name', 500),
    enabled: user?.role === 'admin',
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['admin-agendamentos'],
    queryFn: () => base44.entities.Agendamento.list('-created_date', 500),
    enabled: user?.role === 'admin',
  });

  const { data: transacoes = [] } = useQuery({
    queryKey: ['admin-transacoes'],
    queryFn: () => base44.entities.Transacao.list('-created_date', 500),
    enabled: user?.role === 'admin',
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['admin-clientes'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
    enabled: user?.role === 'admin',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
            <p className="text-slate-500">
              Você precisa ser administrador para acessar esta área.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cálculos
  const totalUsuarios = usuarios.length;
  const usuariosPorPlano = {
    gratuito: usuarios.filter(u => !u.plano || u.plano === 'gratuito').length,
    basico: usuarios.filter(u => u.plano === 'basico').length,
    premium: usuarios.filter(u => u.plano === 'premium').length
  };

  const totalAgendamentos = agendamentos.length;
  const agendamentosHoje = agendamentos.filter(a => 
    a.data === format(new Date(), 'yyyy-MM-dd')
  ).length;

  const receitaTotal = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const receitaMensal = transacoes
    .filter(t => t.tipo === 'receita' && t.data?.startsWith(format(new Date(), 'yyyy-MM')))
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const totalClientes = clientes.length;

  // Agendamentos recentes
  const agendamentosRecentes = agendamentos.slice(0, 10);

  // Gráfico de usuários por plano
  const chartUsuarios = [
    { plano: 'Gratuito', usuarios: usuariosPorPlano.gratuito, fill: '#64748b' },
    { plano: 'Básico', usuarios: usuariosPorPlano.basico, fill: '#3b82f6' },
    { plano: 'Premium', usuarios: usuariosPorPlano.premium, fill: '#8b5cf6' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
            <p className="text-slate-500">Visão geral completa do sistema</p>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Usuários</p>
                  <p className="text-2xl font-bold text-slate-800">{totalUsuarios}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-xl">
                  <Calendar className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Agendamentos</p>
                  <p className="text-2xl font-bold text-slate-800">{totalAgendamentos}</p>
                  <p className="text-xs text-slate-400">Hoje: {agendamentosHoje}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Receita Total</p>
                  <p className="text-2xl font-bold text-slate-800">
                    R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-slate-400">Mês: R$ {receitaMensal.toFixed(0)}</p>
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
                  <p className="text-sm text-slate-500">Total Clientes</p>
                  <p className="text-2xl font-bold text-slate-800">{totalClientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="usuarios" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
            <TabsTrigger value="analise">Análise</TabsTrigger>
          </TabsList>

          {/* Tab Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {usuarios.map((usuario) => (
                    <div 
                      key={usuario.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {usuario.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{usuario.full_name || 'Sem nome'}</p>
                          <p className="text-sm text-slate-500">{usuario.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={usuario.role === 'admin' ? 'default' : 'secondary'}>
                          {usuario.role === 'admin' ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            'Usuário'
                          )}
                        </Badge>
                        <Badge className={cn(
                          usuario.plano === 'premium' ? 'bg-violet-100 text-violet-700' :
                          usuario.plano === 'basico' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {usuario.plano === 'premium' && <Crown className="w-3 h-3 mr-1" />}
                          {!usuario.plano || usuario.plano === 'gratuito' ? 'Gratuito' : 
                           usuario.plano.charAt(0).toUpperCase() + usuario.plano.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Agendamentos */}
          <TabsContent value="agendamentos">
            <Card>
              <CardHeader>
                <CardTitle>Agendamentos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agendamentosRecentes.map((agendamento) => (
                    <div 
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center",
                          agendamento.status === 'concluido' ? 'bg-green-100' :
                          agendamento.status === 'confirmado' ? 'bg-blue-100' :
                          agendamento.status === 'cancelado' ? 'bg-red-100' : 'bg-slate-100'
                        )}>
                          {agendamento.status === 'concluido' ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{agendamento.cliente_nome}</p>
                          <p className="text-sm text-slate-500">
                            {agendamento.servico_nome} • {agendamento.data && format(new Date(agendamento.data), 'dd/MM/yyyy')} às {agendamento.horario}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={cn(
                          agendamento.status === 'concluido' ? 'bg-green-100 text-green-700' :
                          agendamento.status === 'confirmado' ? 'bg-blue-100 text-blue-700' :
                          agendamento.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {agendamento.status}
                        </Badge>
                        <p className="font-semibold text-slate-700">
                          R$ {agendamento.valor?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Análise */}
          <TabsContent value="analise">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Planos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chartUsuarios.map((item) => (
                      <div key={item.plano}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{item.plano}</span>
                          <span className="text-sm font-bold text-slate-800">{item.usuarios} usuários</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div 
                            className="h-3 rounded-full transition-all"
                            style={{ 
                              width: `${(item.usuarios / totalUsuarios) * 100}%`,
                              backgroundColor: item.fill
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                    <div>
                      <p className="text-sm text-emerald-600 font-medium">Receita Total</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign className="w-10 h-10 text-emerald-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Receita Mensal</p>
                      <p className="text-2xl font-bold text-blue-700">
                        R$ {receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-blue-600" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl">
                    <div>
                      <p className="text-sm text-violet-600 font-medium">Ticket Médio</p>
                      <p className="text-2xl font-bold text-violet-700">
                        R$ {totalAgendamentos > 0 ? (receitaTotal / totalAgendamentos).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <Calendar className="w-10 h-10 text-violet-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
