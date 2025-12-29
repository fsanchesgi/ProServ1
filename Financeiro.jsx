import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, TrendingUp, TrendingDown, Plus, Search,
  ArrowUpCircle, ArrowDownCircle, Calendar, Filter,
  Edit2, Trash2, PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

export default function Financeiro() {
  const [user, setUser] = useState(null);
  const [mesAtual, setMesAtual] = useState(format(new Date(), 'yyyy-MM'));
  const [showModal, setShowModal] = useState(false);
  const [editingTransacao, setEditingTransacao] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [formData, setFormData] = useState({
    tipo: 'receita',
    categoria: 'servico',
    descricao: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    cliente_nome: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const plano = user?.plano || 'gratuito';

  const { data: transacoes = [], isLoading } = useQuery({
    queryKey: ['transacoes'],
    queryFn: () => base44.entities.Transacao.list('-data', 500),
    enabled: plano === 'premium',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transacao.create({
      ...data,
      valor: parseFloat(data.valor) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transacoes']);
      setShowModal(false);
      resetForm();
      toast.success('Transação registrada!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transacao.update(id, {
      ...data,
      valor: parseFloat(data.valor) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transacoes']);
      setShowModal(false);
      setEditingTransacao(null);
      resetForm();
      toast.success('Transação atualizada!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transacoes']);
      toast.success('Transação excluída!');
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: 'receita',
      categoria: 'servico',
      descricao: '',
      valor: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      cliente_nome: ''
    });
  };

  const handleOpenCreate = (tipo = 'receita') => {
    setEditingTransacao(null);
    resetForm();
    setFormData(prev => ({ ...prev, tipo }));
    setShowModal(true);
  };

  const handleOpenEdit = (transacao) => {
    setEditingTransacao(transacao);
    setFormData({
      tipo: transacao.tipo,
      categoria: transacao.categoria || 'outros',
      descricao: transacao.descricao || '',
      valor: transacao.valor?.toString() || '',
      data: transacao.data || format(new Date(), 'yyyy-MM-dd'),
      cliente_nome: transacao.cliente_nome || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.valor) {
      toast.error('Valor é obrigatório');
      return;
    }

    if (editingTransacao) {
      updateMutation.mutate({ id: editingTransacao.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filtrar transações do mês
  const transacoesMes = transacoes.filter(t => t.data?.startsWith(mesAtual));
  const transacoesFiltradas = filtroTipo === 'todos' 
    ? transacoesMes 
    : transacoesMes.filter(t => t.tipo === filtroTipo);

  // Cálculos
  const totalReceitas = transacoesMes
    .filter(t => t.tipo === 'receita')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const totalDespesas = transacoesMes
    .filter(t => t.tipo === 'despesa')
    .reduce((sum, t) => sum + (t.valor || 0), 0);

  const saldo = totalReceitas - totalDespesas;

  // Dados para gráfico de linha
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const mes = subMonths(new Date(), i);
    const mesKey = format(mes, 'yyyy-MM');
    const mesTransacoes = transacoes.filter(t => t.data?.startsWith(mesKey));
    
    chartData.push({
      mes: format(mes, 'MMM', { locale: ptBR }),
      receitas: mesTransacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + (t.valor || 0), 0),
      despesas: mesTransacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (t.valor || 0), 0)
    });
  }

  // Dados para gráfico de pizza
  const categoriasDespesas = {};
  transacoesMes
    .filter(t => t.tipo === 'despesa')
    .forEach(t => {
      const cat = t.categoria || 'outros';
      categoriasDespesas[cat] = (categoriasDespesas[cat] || 0) + (t.valor || 0);
    });

  const pieData = Object.entries(categoriasDespesas).map(([name, value]) => ({ name, value }));
  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

  const categorias = {
    receita: ['servico', 'produto', 'outros'],
    despesa: ['aluguel', 'material', 'equipamento', 'marketing', 'outros']
  };

  const categoriaNomes = {
    servico: 'Serviço',
    produto: 'Produto',
    aluguel: 'Aluguel',
    material: 'Material',
    equipamento: 'Equipamento',
    marketing: 'Marketing',
    outros: 'Outros'
  };

  // Redirect se não for premium
  if (plano !== 'premium') {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-lg mx-auto mt-20">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-10 h-10 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Recurso Premium</h2>
            <p className="text-slate-500 mb-6">
              O controle financeiro está disponível apenas para assinantes do plano Premium.
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
            <h1 className="text-3xl font-bold text-slate-800">Financeiro</h1>
            <p className="text-slate-500 mt-1">
              Controle suas receitas e despesas
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => handleOpenCreate('despesa')}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <ArrowDownCircle className="w-5 h-5 mr-2" />
              Nova Despesa
            </Button>
            <Button 
              onClick={() => handleOpenCreate('receita')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <ArrowUpCircle className="w-5 h-5 mr-2" />
              Nova Receita
            </Button>
          </div>
        </div>

        {/* Seletor de Mês */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-400" />
              <Input
                type="month"
                value={mesAtual}
                onChange={(e) => setMesAtual(e.target.value)}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Receitas</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Despesas</p>
                  <p className="text-3xl font-bold text-red-600">
                    R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 rounded-full -mr-16 -mt-16 opacity-10" />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Saldo</p>
                  <p className={cn(
                    "text-3xl font-bold",
                    saldo >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 bg-violet-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="receitas" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.3}
                      name="Receitas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="despesas" 
                      stackId="2"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.3}
                      name="Despesas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${categoriaNomes[name] || name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <p>Nenhuma despesa neste mês</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Transações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transações</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {transacoesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transacoesFiltradas.map((transacao) => (
                  <div 
                    key={transacao.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        transacao.tipo === 'receita' ? "bg-emerald-100" : "bg-red-100"
                      )}>
                        {transacao.tipo === 'receita' ? (
                          <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {transacao.descricao || categoriaNomes[transacao.categoria] || 'Transação'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <span>{format(new Date(transacao.data), 'dd/MM/yyyy')}</span>
                          <Badge variant="secondary" className="text-xs">
                            {categoriaNomes[transacao.categoria] || transacao.categoria}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={cn(
                        "font-bold text-lg",
                        transacao.tipo === 'receita' ? "text-emerald-600" : "text-red-600"
                      )}>
                        {transacao.tipo === 'receita' ? '+' : '-'} R$ {transacao.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(transacao)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500"
                          onClick={() => deleteMutation.mutate(transacao.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransacao ? 'Editar Transação' : formData.tipo === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v, categoria: categorias[v][0] })}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="receita" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Receita
                </TabsTrigger>
                <TabsTrigger value="despesa" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Despesa
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias[formData.tipo].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {categoriaNomes[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input 
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da transação..."
              />
            </div>

            {formData.tipo === 'receita' && (
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Input 
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className={cn(
                  formData.tipo === 'receita' 
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600" 
                    : "bg-gradient-to-r from-red-600 to-rose-600"
                )}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
