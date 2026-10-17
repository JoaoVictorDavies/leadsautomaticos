'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Inicialização limpa lendo estritamente do .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CRM() {
  const [leads, setLeads] = useState<any[]>([])

  useEffect(() => {
    carregarLeads()
  }, [])

  async function carregarLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('data_captura', { ascending: false })
    if (data) setLeads(data)
  }

  async function mudarStatus(id: string, novoStatus: string) {
    await supabase.from('leads').update({ status: novoStatus }).eq('id', id)
    carregarLeads()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-gray-800">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-900">CRM Volte Comercial</h1>
        
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-4">Empresa / Bairro</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-bold">{lead.nome}</p>
                    <p className="text-xs text-gray-500">{lead.nicho} • {lead.bairro}, {lead.cidade}</p>
                  </td>
                  <td className="p-4">{lead.telefone}</td>
                  <td className="p-4">
                    <select 
                      value={lead.status}
                      onChange={(e) => mudarStatus(lead.id, e.target.value)}
                      className={`p-2 rounded text-sm font-bold outline-none cursor-pointer
                        ${lead.status === 'Novo' ? 'bg-blue-100 text-blue-800' : ''}
                        ${lead.status === 'Contatado' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${lead.status === 'Retorno' ? 'bg-purple-100 text-purple-800' : ''}
                        ${lead.status === 'Fechado' ? 'bg-green-100 text-green-800' : ''}
                        ${lead.status === 'Recusado' ? 'bg-red-100 text-red-800' : ''}
                      `}
                    >
                      <option value="Novo">Novo</option>
                      <option value="Contatado">Contatado</option>
                      <option value="Retorno">Retorno Solicitado</option>
                      <option value="Fechado">Fechado</option>
                      <option value="Recusado">Recusado</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <a 
                      href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}?text=Ol%C3%A1%20vi%20voc%C3%AAs%20no%20Google...`}
                      target="_blank"
                      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                    >
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}