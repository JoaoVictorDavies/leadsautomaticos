'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

const TEXTO_WPP = `🍽️ Conheça o O!Fluxo!\n\n📲 Seus garçons lançam os pedidos pelo celular e eles chegam direto à cozinha!\n\n🚀 Está começando agora? Envie uma foto do seu cardápio e o sistema configura sua loja automaticamente.\n\n🆓 Teste grátis!\n\n👉 Crie sua loja e experimente:\nhttps://o-fluxo-aplicativo-oficial.vercel.app/acesso-loja?affiliate_ref=7ef3fdd`

// --- MOTOR DE NORMALIZAÇÃO ---
// Ignora maiúsculas, minúsculas e acentos para agrupar corretamente
const normalizarTexto = (texto: string | null | undefined) => {
  if (!texto) return 'desconhecido'
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

export default function CRM() {
  const [leads, setLeads] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Controle de Navegação (Funil)
  const [cidadeSelecionada, setCidadeSelecionada] = useState<{norm: string, nomeExibicao: string} | null>(null)
  const [bairroSelecionado, setBairroSelecionado] = useState<{norm: string, nomeExibicao: string} | null>(null)

  // Filtros internos (Quando já está dentro de um bairro)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    carregarLeads()
  }, [])

  async function carregarLeads() {
    setCarregando(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('data_captura', { ascending: false })
      .limit(100000) // Limite estendido para suportar a base nacional
    
    if (data) setLeads(data)
    setCarregando(false)
  }

  // Otimização: Atualiza a tela instantaneamente (Optimistic Update) e salva no banco em background
  async function mudarStatus(id: string, novoStatus: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: novoStatus } : l))
    await supabase.from('leads').update({ status: novoStatus }).eq('id', id)
  }

  async function salvarObservacao(id: string, texto: string) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, observacao: texto } : l))
    await supabase.from('leads').update({ observacao: texto }).eq('id', id)
  }

  async function handleWhatsAppClick(lead: any) {
    mudarStatus(lead.id, 'Contatado')
    const numeroLimpo = lead.telefone.replace(/\D/g, '')
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(TEXTO_WPP)}`
    window.open(url, '_blank')
  }

  // --- LÓGICA DE AGRUPAMENTO MATEMÁTICO ---
  const cidadesAgrupadas = useMemo(() => {
    const mapa = new Map<string, { nomeExibicao: string, quantidade: number }>()
    leads.forEach(lead => {
      const norm = normalizarTexto(lead.cidade)
      if (!mapa.has(norm)) {
        // Salva a primeira versão original encontrada para exibir bonito na tela
        mapa.set(norm, { nomeExibicao: lead.cidade || 'Desconhecida', quantidade: 0 })
      }
      mapa.get(norm)!.quantidade += 1
    })
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade)
  }, [leads])

  const bairrosAgrupados = useMemo(() => {
    if (!cidadeSelecionada) return []
    const mapa = new Map<string, { nomeExibicao: string, quantidade: number }>()
    
    const leadsDestaCidade = leads.filter(l => normalizarTexto(l.cidade) === cidadeSelecionada.norm)
    leadsDestaCidade.forEach(lead => {
      const norm = normalizarTexto(lead.bairro)
      if (!mapa.has(norm)) {
        mapa.set(norm, { nomeExibicao: lead.bairro || 'Desconhecido', quantidade: 0 })
      }
      mapa.get(norm)!.quantidade += 1
    })
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade)
  }, [leads, cidadeSelecionada])

  const leadsParaExibir = useMemo(() => {
    if (!cidadeSelecionada || !bairroSelecionado) return []
    return leads.filter(l => {
      const matchCidade = normalizarTexto(l.cidade) === cidadeSelecionada.norm
      const matchBairro = normalizarTexto(l.bairro) === bairroSelecionado.norm
      const matchBusca = l.nome.toLowerCase().includes(busca.toLowerCase()) || l.telefone.includes(busca)
      const matchStatus = filtroStatus === 'Todos' || l.status === filtroStatus
      return matchCidade && matchBairro && matchBusca && matchStatus
    })
  }, [leads, cidadeSelecionada, bairroSelecionado, busca, filtroStatus])


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      
      {/* HEADER FIXO & BREADCRUMBS */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">VOLTE CRM</h1>
              <p className="text-slate-500 text-sm font-medium">Controle Nacional de Operações</p>
            </div>
            <div className="bg-slate-100 px-5 py-2 rounded-xl border border-slate-200 flex flex-col items-center shadow-inner">
              <span className="text-[10px] md:text-xs text-slate-500 uppercase font-black tracking-widest">Base Total Global</span>
              <span className="text-xl md:text-2xl font-black text-blue-600">{leads.length.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Rastro de Navegação (Pão de migalhas) */}
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs md:text-sm font-bold bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto whitespace-nowrap">
            <button 
              onClick={() => { setCidadeSelecionada(null); setBairroSelecionado(null); }} 
              className={`hover:text-blue-600 transition-colors ${!cidadeSelecionada ? 'text-blue-600' : 'text-slate-500'}`}
            >
              🌎 Brasil (Geral)
            </button>
            
            {cidadeSelecionada && (
              <>
                <span className="text-slate-400">/</span>
                <button 
                  onClick={() => setBairroSelecionado(null)} 
                  className={`hover:text-blue-600 transition-colors ${!bairroSelecionado ? 'text-blue-600' : 'text-slate-500'}`}
                >
                  📍 {cidadeSelecionada.nomeExibicao}
                </button>
              </>
            )}

            {bairroSelecionado && (
              <>
                <span className="text-slate-400">/</span>
                <span className="text-blue-600">🏘️ {bairroSelecionado.nomeExibicao}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4">
        
        {carregando ? (
          <div className="text-center py-20 text-slate-500 font-bold animate-pulse">
            Carregando banco de dados da Volte...
          </div>
        ) : (
          <>
            {/* NÍVEL 1: EXIBIÇÃO DE CIDADES */}
            {!cidadeSelecionada && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cidadesAgrupadas.map(cidade => (
                  <button 
                    key={cidade.nomeExibicao}
                    onClick={() => setCidadeSelecionada({ norm: normalizarTexto(cidade.nomeExibicao), nomeExibicao: cidade.nomeExibicao })}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all text-left group flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-black text-slate-800 text-lg md:text-xl group-hover:text-blue-600 transition-colors">{cidade.nomeExibicao}</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">{cidade.quantidade.toLocaleString('pt-BR')} leads</p>
                    </div>
                    <div className="bg-slate-50 text-slate-400 p-3 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      ➔
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* NÍVEL 2: EXIBIÇÃO DE BAIRROS (Após clicar em uma cidade) */}
            {cidadeSelecionada && !bairroSelecionado && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bairrosAgrupados.map(bairro => (
                  <button 
                    key={bairro.nomeExibicao}
                    onClick={() => setBairroSelecionado({ norm: normalizarTexto(bairro.nomeExibicao), nomeExibicao: bairro.nomeExibicao })}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all text-left group flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 text-md group-hover:text-blue-600 transition-colors line-clamp-1">{bairro.nomeExibicao}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">{bairro.quantidade.toLocaleString('pt-BR')} leads</p>
                    </div>
                    <div className="text-slate-300 group-hover:text-blue-500">➔</div>
                  </button>
                ))}
              </div>
            )}

            {/* NÍVEL 3: EXIBIÇÃO DOS LEADS (Após clicar no Bairro) */}
            {cidadeSelecionada && bairroSelecionado && (
              <div className="space-y-4">
                
                {/* Filtros Internos do Bairro */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="🔍 Buscar restaurante ou telefone neste bairro..." 
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                  />
                  <select 
                    value={filtroStatus} 
                    onChange={(e) => setFiltroStatus(e.target.value)} 
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none font-bold text-slate-700"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="Novo">Novo</option>
                    <option value="Contatado">Contatado</option>
                    <option value="Retorno">Retorno Solicitado</option>
                    <option value="Fechado">Fechado</option>
                    <option value="Recusado">Recusado</option>
                  </select>
                </div>

                {/* VISÃO CELULAR: CARDS RESPONSIVOS */}
                <div className="md:hidden space-y-4">
                  {leadsParaExibir.map(lead => (
                    <div key={lead.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-lg text-slate-900 leading-tight">{lead.nome}</h3>
                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md font-bold uppercase text-slate-500 whitespace-nowrap ml-2 border border-slate-200">
                          {lead.nicho}
                        </span>
                      </div>
                      
                      <p className="font-mono text-lg font-black text-slate-700 tracking-wider bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                        {lead.telefone}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => handleWhatsAppClick(lead)}
                          className="bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#1ebd5a] active:scale-95 transition-all shadow-sm"
                        >
                          WhatsApp
                        </button>
                        {lead.website !== 'Não informado' ? (
                          <a href={lead.website} target="_blank" className="bg-blue-50 text-blue-600 py-3 rounded-xl font-bold text-sm text-center border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all">
                            Ver Site
                          </a>
                        ) : (
                          <div className="bg-slate-50 text-slate-400 py-3 rounded-xl font-bold text-sm text-center border border-slate-100">
                            Sem Site
                          </div>
                        )}
                      </div>

                      <select 
                        value={lead.status}
                        onChange={(e) => mudarStatus(lead.id, e.target.value)}
                        className="w-full p-3 rounded-xl text-sm font-bold outline-none border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Novo">Status: Novo</option>
                        <option value="Contatado">Status: Contatado</option>
                        <option value="Retorno">Status: Retorno</option>
                        <option value="Fechado">Status: Fechado</option>
                        <option value="Recusado">Status: Recusado</option>
                      </select>

                      <textarea
                        defaultValue={lead.observacao}
                        onBlur={(e) => salvarObservacao(lead.id, e.target.value)}
                        placeholder="Adicionar nota rápida..."
                        className="w-full text-sm p-3 border border-slate-200 rounded-xl resize-none outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                      />
                    </div>
                  ))}
                </div>

                {/* VISÃO DESKTOP (NOTEBOOK/PC): TABELA CLÁSSICA */}
                <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wider">Estabelecimento</th>
                        <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wider">Contato</th>
                        <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wider">Status</th>
                        <th className="p-4 font-black text-slate-600 uppercase text-xs tracking-wider">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leadsParaExibir.map((lead) => (
                        <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-slate-900 text-lg">{lead.nome}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold">{lead.nicho}</span>
                              {lead.website !== 'Não informado' && (
                                <a href={lead.website} target="_blank" className="text-xs text-blue-600 hover:underline font-bold">🌐 Website</a>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-sm text-slate-700 font-bold mb-2">{lead.telefone}</p>
                            <button 
                              onClick={() => handleWhatsAppClick(lead)}
                              className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#1ebd5a] transition-all shadow-sm active:scale-95"
                            >
                              Enviar WhatsApp
                            </button>
                          </td>
                          <td className="p-4">
                            <select 
                              value={lead.status}
                              onChange={(e) => mudarStatus(lead.id, e.target.value)}
                              className={`p-2 rounded-lg text-sm font-bold outline-none cursor-pointer border-0 ring-1 ring-inset focus:ring-2
                                ${lead.status === 'Novo' ? 'bg-blue-50 text-blue-700 ring-blue-200' : ''}
                                ${lead.status === 'Contatado' ? 'bg-amber-50 text-amber-700 ring-amber-200' : ''}
                                ${lead.status === 'Retorno' ? 'bg-purple-50 text-purple-700 ring-purple-200' : ''}
                                ${lead.status === 'Fechado' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : ''}
                                ${lead.status === 'Recusado' ? 'bg-red-50 text-red-700 ring-red-200' : ''}
                              `}
                            >
                              <option value="Novo">Novo</option>
                              <option value="Contatado">Contatado</option>
                              <option value="Retorno">Retorno</option>
                              <option value="Fechado">Fechado</option>
                              <option value="Recusado">Recusado</option>
                            </select>
                          </td>
                          <td className="p-4 w-1/3">
                            <textarea
                              defaultValue={lead.observacao}
                              onBlur={(e) => salvarObservacao(lead.id, e.target.value)}
                              placeholder="Adicionar nota..."
                              className="w-full text-sm p-3 border border-slate-200 rounded-lg resize-none outline-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                            />
                          </td>
                        </tr>
                      ))}
                      {leadsParaExibir.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center text-slate-500 font-bold bg-slate-50/50">
                            Nenhum lead encontrado neste bairro com os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}