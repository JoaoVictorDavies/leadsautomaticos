import pandas as pd
import re

def limpar_telefone(telefone):
    if not isinstance(telefone, str) or telefone == "Não informado":
        return ""
    # Remove tudo que não for número
    numero = re.sub(r'\D', '', telefone)
    # Adiciona o DDI do Brasil (55) caso não tenha
    if len(numero) >= 10 and not numero.startswith('55'):
        numero = '55' + numero
    return numero

def gerar_html():
    try:
        # Lê o banco mestre atualizado
        df = pd.read_csv("banco_leads_volte.csv")
    except FileNotFoundError:
        print("Arquivo CSV não encontrado. Rode o scraper.py primeiro para popular o banco.")
        return

    # Mensagem padrão de prospecção da Volte codificada para URL
    msg_url = "Ol%C3%A1%2C%20vi%20voc%C3%AAs%20no%20Google.%20Sou%20da%20Volte%20e%20n%C3%B3s%20criamos%20uma%20tecnologia%20que%20l%C3%AA%20a%20foto%20do%20seu%20card%C3%A1pio%20e%20monta%20o%20seu%20sistema%20de%20gest%C3%A3o%20sozinho%20em%20minutos.%20Quer%20ver%20a%20m%C3%A1gica%20acontecer%3F"

    linhas_html = ""
    for index, row in df.iterrows():
        nome = row.get("Nome", "Sem Nome")
        telefone_cru = row.get("Telefone", "Não informado")
        website = row.get("Website", "#")
        maps_link = row.get("Link_Maps", "#")
        origem_busca = row.get("Bairro/Busca", "Geral")
        
        numero_limpo = limpar_telefone(telefone_cru)
        
        # Lógica do botão de WhatsApp
        if numero_limpo:
            btn_whats = f'<a href="https://wa.me/{numero_limpo}?text={msg_url}" target="_blank" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center text-sm transition-colors shadow">Chamar no WhatsApp</a>'
        else:
            btn_whats = f'<span class="bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-not-allowed">Sem Telefone</span>'

        btn_site = f'<a href="{website}" target="_blank" class="text-blue-600 hover:underline text-sm truncate max-w-xs block">Visitar Site</a>' if website != "Não informado" else '<span class="text-gray-400 text-sm">Sem site</span>'

        linhas_html += f"""
        <tr class="border-b hover:bg-gray-50 transition-colors">
            <td class="p-4">
                <p class="font-semibold text-gray-800">{nome}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{origem_busca}</span>
                    <a href="{maps_link}" target="_blank" class="text-xs text-blue-500 hover:underline">Ver no Maps</a>
                </div>
            </td>
            <td class="p-4 text-gray-600 font-mono text-sm">{telefone_cru}</td>
            <td class="p-4">{btn_site}</td>
            <td class="p-4 text-right">{btn_whats}</td>
        </tr>
        """

    html_template = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CRM Volte - Leads Extraídos</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 text-gray-800 p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            
            <!-- Header do Painel -->
            <div class="bg-white rounded-lg shadow-sm p-6 mb-6 flex flex-col md:flex-row justify-between items-center border border-gray-200">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        VOLTE Comercial
                    </h1>
                    <p class="text-gray-500 text-sm mt-1">Base de dados mestre de prospecção.</p>
                </div>
                <div class="mt-4 md:mt-0 bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg shadow-sm text-center">
                    <span class="block text-xs text-blue-600 font-semibold uppercase tracking-wider">Total de Leads na Base</span>
                    <span class="block text-2xl font-black text-blue-800">{len(df)}</span>
                </div>
            </div>
            
            <!-- Tabela de Leads -->
            <div class="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr class="bg-gray-800 text-white text-sm uppercase tracking-wider">
                                <th class="p-4 font-semibold">Estabelecimento</th>
                                <th class="p-4 font-semibold">Telefone</th>
                                <th class="p-4 font-semibold">Presença Web</th>
                                <th class="p-4 font-semibold text-right">Ação Comercial</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            {linhas_html}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    </body>
    </html>
    """

    with open("painel_volte.html", "w", encoding="utf-8") as file:
        file.write(html_template)
    
    print("\n---------------------------------------------------------")
    print(f"Sucesso! Painel gerado com {len(df)} leads.")
    print("Abra o arquivo 'painel_volte.html' no seu navegador.")
    print("---------------------------------------------------------")

if __name__ == "__main__":
    gerar_html()