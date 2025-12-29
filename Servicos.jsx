import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, Plus, Search, Clock, DollarSign,
  Edit2, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Servicos() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao: '',
    ativo: true
  });

  const queryClient = useQueryClient();

  const { data: servicos = [], isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: () => base44.entities.Servico.list('nome'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Servico.create({
      ...data,
      preco: parseFloat(data.preco) || 0,
      duracao: parseInt(data.duracao) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      setShowModal(false);
      resetForm();
      toast.success('Serviço cadastrado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Servico.update(id, {
      ...data,
      preco: parseFloat(data.preco) || 0,
      duracao: parseInt(data.duracao) || 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      setShowModal(false);
      setEditingServico(null);
      resetForm();
      toast.success('Serviço atualizado!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Servico.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
      toast.success('Serviço excluído!');
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: ({ id, ativo }) => base44.entities.Servico.update(id, { ativo }),
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos']);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      duracao: '',
      ativo: true
    });
  };

  const handleOpenCreate = () => {
    setEditingServico(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome || '',
      descricao: servico.descricao || '',
      preco: servico.preco?.toString() || '',
      duracao: servico.duracao?.toString() || '',
      ativo: servico.ativo !== false
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.preco) {
      toast.error('Preço é obrigatório');
      return;
    }

    if (editingServico) {
      updateMutation.mutate({ id: editingServico.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredServicos = servicos.filter(s => 
    s.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuracao = (minutos) => {
    if (!minutos) return '';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h && m) return `${h}h ${m}min`;
    if (h) return `${h}h`;
    return `${m}min`;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Serviços</h1>
            <p className="text-slate-500 mt-1">
              {servicos.length} serviços cadastrados
            </p>
          </div>
          <Button 
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Serviço
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar serviços..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredServicos.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-500 mb-4">
                {search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
              </p>
              {!search && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar primeiro serviço
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredServicos.map((servico, index) => (
                <motion.div
                  key={servico.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "hover:shadow-lg transition-all group",
                    !servico.ativo && "opacity-60"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 text-lg">{servico.nome}</h3>
                            {!servico.ativo && (
                              <Badge variant="secondary" className="bg-slate-200">Inativo</Badge>
                            )}
                          </div>
                          {servico.descricao && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{servico.descricao}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(servico)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => deleteMutation.mutate(servico.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-emerald-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-bold">
                              R$ {servico.preco?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {servico.duracao > 0 && (
                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                              <Clock className="w-4 h-4" />
                              {formatDuracao(servico.duracao)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleAtivoMutation.mutate({ id: servico.id, ativo: !servico.ativo })}
                          className="text-slate-400 hover:text-violet-600 transition-colors"
                        >
                          {servico.ativo ? (
                            <ToggleRight className="w-8 h-8 text-violet-600" />
                          ) : (
                            <ToggleLeft className="w-8 h-8" />
                          )}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingServico ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input 
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Corte de cabelo"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do serviço..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.preco}
                  onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (minutos)</Label>
                <Input 
                  type="number"
                  min="0"
                  value={formData.duracao}
                  onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label>Serviço ativo</Label>
              <Switch 
                checked={formData.ativo}
                onCheckedChange={(v) => setFormData({ ...formData, ativo: v })}
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
