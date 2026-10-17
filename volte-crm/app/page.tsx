'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

// MENSAGEM DO OFLUXO CONFIGURADA
const TEXTO_WPP = `🍽️ Conheça o O!Fluxo!\n\n📲 Seus garçons lançam os pedidos pelo celular e eles chegam direto à cozinha!\n\n🚀 Está começando agora? Envie uma foto do seu cardápio e o sistema configura sua loja automaticamente.\n\n🆓 Teste grátis!\n\n👉 Crie sua loja e experimente:\nhttps://o-fluxo-aplicativo-oficial.vercel.app/acesso-loja?affiliate_ref=7ef3fdd`;

export default function CRM() {
  const [leads, setLeads] = useState<any[]>([])
  
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')
  const [filtroCidade, setFiltroCidade] = useState('Todas')
  const [filtroBairro, setFiltroBairro] = useState('Todos')
  
  const [modalAberto, setModalAberto] = useState(false)
  const [novoLead, setNovoLead] = useState({ nome: '', telefone: '', website: '', cidade: '', bairro: '', nicho: '' })

  useEffect(() => {
    carregarLeads()
  }, [])

  async function carregarLeads() {
    const { data } = await supabase.from('leads').select('*').order('data_captura', { ascending: false })
    if (data) setLeads(data)
  }

  async function mudarStatus(id: string, novoStatus: string) {
    await supabase.from('leads').update({ status: novoStatus }).eq('id', id)
    carregarLeads()
  }

  async function salvarObservacao(id: string, texto: string) {
    await supabase.from('leads').update({ observacao: texto }).eq('id', id)
  }

  // NOVA FUNÇÃO: Disparo e Atualização de Status
  async function handleWhatsAppClick(lead: any) {
    // 1. Atualiza silenciosamente no banco para 'Contatado'
    await mudarStatus(lead.id, 'Contatado');
    
    // 2. Prepara o link e abre a aba do WhatsApp
    const numeroLimpo = lead.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(TEXTO_WPP)}`;
    window.open(url, '_blank');
  }

  async function cadastrarLeadManual(e: React.FormEvent) {
    e.preventDefault()
    const leadManual = {
      ...novoLead,
      link_maps: `manual_${Date.now()}`,
      status: 'Novo',
      observacao: ''
    }
    await supabase.from('leads').insert([leadManual])
    setModalAberto(false)
    setNovoLead({ nome: '', telefone: '', website: '', cidade: '', bairro: '', nicho: '' })
    carregarLeads()
  }

  const cidades = useMemo(() => ['Todas', ...Array.from(new Set(leads.map(l => l.cidade).filter(Boolean)))], [leads])
  const bairros = useMemo(() => ['Todos', ...Array.from(new Set(leads.map(l => l.bairro).filter(Boolean)))], [leads])

  const leadsFiltrados = useMemo(() => {
    return leads.filter(lead => {
      const matchBusca = lead.nome.toLowerCase().includes(busca.toLowerCase()) || lead.telefone.includes(busca)
      const matchStatus = filtroStatus === 'Todos' || lead.status === filtroStatus
      const matchCidade = filtroCidade === 'Todas' || lead.cidade === filtroCidade
      const matchBairro = filtroBairro === 'Todos' || lead.bairro === filtroBairro
      return matchBusca && matchStatus && matchCidade && matchBairro
    })
  }, [leads, busca, filtroStatus, filtroCidade, filtroBairro])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">VOLTE CRM</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Controle Tecnológico Operacional</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4">
            <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 uppercase font-bold block">Total Base</span>
              <span className="text-xl font-black text-slate-800">{leads.length}</span>
            </div>
            <button onClick={() => setModalAberto(true)} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md">
              + Novo Lead
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">🔍</span>
            <input type="text" placeholder="Buscar restaurante ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none" />
          </div>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-medium">
            <option value="Todos">Todos os Status</option>
            <option value="Novo">Novo</option>
            <option value="Contatado">Contatado</option>
            <option value="Retorno">Retorno Solicitado</option>
            <option value="Fechado">Fechado</option>
            <option value="Recusado">Recusado</option>
          </select>
          <select value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none font-medium">
            {cidades.map(c => <option key={c} value={c}>{c === 'Todas' ? 'Todas as Cidades' : c}</option>)}
          </select>
          <select value={filtroBairro} onChange={(e) => setFiltroBairro(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg outline-none font-medium">
            {bairros.map(b => <option key={b} value={b}>{b === 'Todos' ? 'Todos os Bairros' : b}</option>)}
          </select>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-600">Estabelecimento</th>
                  <th className="p-4 font-bold text-slate-600">Contato / Ações</th>
                  <th className="p-4 font-bold text-slate-600">Status</th>
                  <th className="p-4 font-bold text-slate-600">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsFiltrados.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-lg">{lead.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">{lead.nicho}</span>
                        <span className="text-xs text-slate-500 font-medium">{lead.bairro}, {lead.cidade}</span>
                      </div>
                      {lead.website !== 'Não informado' && (
                        <a href={lead.website} target="_blank" className="text-xs text-blue-600 hover:underline mt-2 inline-block font-medium">🌐 Visitar Website</a>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-sm text-slate-700 font-bold mb-2">{lead.telefone}</p>
                      
                      {/* BOTÃO ATUALIZADO */}
                      <button 
                        onClick={() => handleWhatsAppClick(lead)}
                        className="bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1ebd5a] transition-all inline-flex items-center gap-1 shadow-sm border-none cursor-pointer"
                      >
                        Enviar WhatsApp
                      </button>

                    </td>
                    <td className="p-4">
                      <select 
                        value={lead.status}
                        onChange={(e) => mudarStatus(lead.id, e.target.value)}
                        className={`p-2 rounded-lg text-sm font-bold outline-none cursor-pointer border-0 ring-1 ring-inset
                          ${lead.status === 'Novo' ? 'bg-blue-50 text-blue-700 ring-blue-200' : ''}
                          ${lead.status === 'Contatado' ? 'bg-amber-50 text-amber-700 ring-amber-200' : ''}
                          ${lead.status === 'Retorno' ? 'bg-purple-50 text-purple-700 ring-purple-200' : ''}
                          ${lead.status === 'Fechado' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : ''}
                          ${lead.status === 'Recusado' ? 'bg-red-50 text-red-700 ring-red-200' : ''}
                        `}
                      >
                        <option value="Novo">Novo</option>
                        <option value="Contatado">Contatado</option>
                        <option value="Retorno">Retorno Solicitado</option>
                        <option value="Fechado">Fechado</option>
                        <option value="Recusado">Recusado</option>
                      </select>
                    </td>
                    <td className="p-4 w-1/3">
                      <textarea
                        defaultValue={lead.observacao}
                        onBlur={(e) => salvarObservacao(lead.id, e.target.value)}
                        placeholder="Adicionar nota..."
                        className="w-full text-sm p-2 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-slate-900 outline-none bg-slate-50 focus:bg-white min-h-[60px]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}