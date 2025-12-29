import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Plus, ChevronLeft, ChevronRight, Clock,
  User, Briefcase, X, Check, AlertCircle, Trash2, Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState(null);
  const [formData, setFormData] = useState({
    cliente_id: '',
    servico_id: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    horario: '09:00',
    observacoes: ''
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
  const mesAtual = format(new Date(), 'yyyy-MM');

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos'],
    queryFn: () => base44.entities.Agendamento.list('-data', 500),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nome', 500),
  });

  const { data: servicos = [] } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.filter({ ativo: true }),
  });

  const agendamentosMes = agendamentos.filter(a => a.data?.startsWith(mesAtual));
  const limiteAtingido = plano === 'gratuito' && agendamentosMes.length >= 10;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      const servico = servicos.find(s => s.id === data.servico_id);
      
      return base44.entities.Agendamento.create({
        ...data,
        cliente_nome: cliente?.nome,
        servico_nome: servico?.nome,
        valor: servico?.preco || 0,
        status: 'agendado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agendamentos']);
      setShowModal(false);
      resetForm();
      toast.success('Agendamento criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const cliente = clientes.find(c => c.id === data.cliente_id);
      const servico = servicos.find(s => s.id === data.servico_id);
      
      return base44.entities.Agendamento.update(id, {
        ...data,
        cliente_nome: cliente?.nome,
        servico_nome: servico?.nome,
        valor: servico?.preco || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agendamentos']);
      setShowModal(false);
      setEditingAgendamento(null);
      resetForm();
      toast.success('Agendamento atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Agendamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['agendamentos']);
      toast.success('Agendamento excluído!');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Agendamento.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['agendamentos']);
      toast.success('Status atualizado!');
    },
  });

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      servico_id: '',
      data: format(selectedDate, 'yyyy-MM-dd'),
      horario: '09:00',
      observacoes: ''
    });
  };

  const handleOpenCreate = () => {
    if (limiteAtingido) {
      toast.error('Limite de agendamentos atingido! Faça upgrade do seu plano.');
      return;
    }
    setEditingAgendamento(null);
    resetForm();
    setFormData(prev => ({ ...prev, data: format(selectedDate, 'yyyy-MM-dd') }));
    setShowModal(true);
  };

  const handleOpenEdit = (agendamento) => {
    setEditingAgendamento(agendamento);
    setFormData({
      cliente_id: agendamento.cliente_id,
      servico_id: agendamento.servico_id,
      data: agendamento.data,
      horario: agendamento.horario,
      observacoes: agendamento.observacoes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.cliente_id || !formData.servico_id) {
      toast.error('Selecione cliente e serviço');
      return;
    }

    if (editingAgendamento) {
      updateMutation.mutate({ id: editingAgendamento.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Gerar dias da semana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filtrar agendamentos do dia selecionado
  const agendamentosDia = agendamentos
    .filter(a => a.data === format(selectedDate, 'yyyy-MM-dd'))
    .sort((a, b) => a.horario?.localeCompare(b.horario));

  const statusColors = {
    agendado: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    confirmado: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    concluido: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    cancelado: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
  };

  const horarios = [];
  for (let h = 7; h <= 21; h++) {
    horarios.push(`${h.toString().padStart(2, '0')}:00`);
    horarios.push(`${h.toString().padStart(2, '0')}:30`);
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Agenda</h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus agendamentos
              {plano === 'gratuito' && (
                <span className="ml-2 text-amber-600">
                  ({agendamentosMes.length}/10 este mês)
                </span>
              )}
            </p>
          </div>
          <Button 
            onClick={handleOpenCreate}
            disabled={limiteAtingido}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Limite Alert */}
        {limiteAtingido && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-amber-800">
                Você atingiu o limite de 10 agendamentos mensais. Faça upgrade para continuar.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendário Semanal */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <CardTitle className="text-lg">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-400 py-2">
                    {day}
                  </div>
                ))}
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const dayAgendamentos = agendamentos.filter(a => a.data === format(day, 'yyyy-MM-dd'));
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative p-3 rounded-xl transition-all text-center",
                        isSelected 
                          ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg" 
                          : isToday
                            ? "bg-violet-100 text-violet-700"
                            : "hover:bg-slate-100"
                      )}
                    >
                      <span className="text-lg font-semibold">{format(day, 'd')}</span>
                      {dayAgendamentos.length > 0 && (
                        <div className={cn(
                          "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white" : "bg-violet-500"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mini Stats */}
              <div className="mt-6 pt-6 border-t space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Agendados</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {agendamentosDia.filter(a => a.status === 'agendado').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Confirmados</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {agendamentosDia.filter(a => a.status === 'confirmado').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Concluídos</span>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {agendamentosDia.filter(a => a.status === 'concluido').length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Agendamentos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-500" />
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agendamentosDia.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500 mb-4">Nenhum agendamento para este dia</p>
                  <Button onClick={handleOpenCreate} disabled={limiteAtingido}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar agendamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {agendamentosDia.map((agendamento) => (
                      <motion.div
                        key={agendamento.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "p-4 rounded-xl border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow",
                          statusColors[agendamento.status]?.border
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "w-14 h-14 rounded-xl flex items-center justify-center",
                              statusColors[agendamento.status]?.bg
                            )}>
                              <Clock className={cn("w-6 h-6", statusColors[agendamento.status]?.text)} />
                            </div>
                            <div>
                              <p className="font-bold text-xl text-slate-800">{agendamento.horario}</p>
                              <p className="font-semibold text-slate-700">{agendamento.cliente_nome}</p>
                              <p className="text-sm text-slate-500">{agendamento.servico_nome}</p>
                              {agendamento.valor > 0 && (
                                <p className="text-sm text-emerald-600 font-medium mt-1">
                                  R$ {agendamento.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={cn(statusColors[agendamento.status]?.bg, statusColors[agendamento.status]?.text)}>
                              {agendamento.status}
                            </Badge>
                            <div className="flex gap-1">
                              {agendamento.status === 'agendado' && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => updateStatusMutation.mutate({ id: agendamento.id, status: 'confirmado' })}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              {agendamento.status === 'confirmado' && (
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => updateStatusMutation.mutate({ id: agendamento.id, status: 'concluido' })}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(agendamento)}
                              >
                                <Edit2 className="w-4 h-4 text-slate-600" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8"
                                onClick={() => deleteMutation.mutate(agendamento.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAgendamento ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={formData.servico_id} onValueChange={(v) => setFormData({ ...formData, servico_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map((servico) => (
                    <SelectItem key={servico.id} value={servico.id}>
                      {servico.nome} - R$ {servico.preco?.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input 
                  type="date" 
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Select value={formData.horario} onValueChange={(v) => setFormData({ ...formData, horario: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {horarios.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações opcionais..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-violet-600 to-purple-600"
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
