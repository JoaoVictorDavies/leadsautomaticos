import time
import os
import pandas as pd
from playwright.sync_api import sync_playwright

ARQUIVO_MESTRE = "banco_leads_volte.csv"

def carregar_urls_existentes():
    # Lê o banco mestre para não pegar os mesmos restaurantes de dias anteriores
    if os.path.exists(ARQUIVO_MESTRE):
        df = pd.read_csv(ARQUIVO_MESTRE)
        # Retorna os links já capturados como um 'set' para busca ultra-rápida
        return set(df['Link_Maps'].dropna().tolist())
    return set()

def scrape_gmaps_em_massa(buscas, max_por_busca=40):
    urls_ja_capturadas = carregar_urls_existentes()
    novos_leads_total = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        
        for query in buscas:
            page = context.new_page()
            print(f"\n--- Iniciando varredura: {query} ---")
            page.goto(f"https://www.google.com/maps/search/{query.replace(' ', '+')}")
            
            try:
                page.wait_for_selector('div[role="feed"]', timeout=15000)
            except:
                print(f"Nenhum resultado ou página travou para: {query}. Pulando...")
                page.close()
                continue

            urls_nesta_busca = set()
            tentativas_sem_novos_links = 0
            
            # Scroll inteligente (Pega apenas o que não está no banco mestre)
            while len(urls_nesta_busca) < max_por_busca:
                links = page.locator('a[href*="/maps/place/"]').all()
                tamanho_anterior = len(urls_nesta_busca)
                
                for link in links:
                    href = link.get_attribute('href')
                    # Regra de Ouro: Só adiciona se não estiver no banco gigante
                    if href and href not in urls_ja_capturadas:
                        urls_nesta_busca.add(href)
                        if len(urls_nesta_busca) >= max_por_busca:
                            break
                
                # Verifica se o Google parou de carregar novos restaurantes
                if len(urls_nesta_busca) == tamanho_anterior:
                    tentativas_sem_novos_links += 1
                else:
                    tentativas_sem_novos_links = 0

                if tentativas_sem_novos_links > 3: # Fim da lista do Maps
                    print("Fim da rolagem do Google Maps atingido.")
                    break

                page.evaluate('document.querySelector(\'div[role="feed"]\').scrollBy(0, 5000)')
                time.sleep(2)
                print(f"Novos links na fila: {len(urls_nesta_busca)}/{max_por_busca}")

            urls_para_visitar = list(urls_nesta_busca)[:max_por_busca]
            
            # Extrair dados de fato
            leads_da_rodada = []
            for index, url in enumerate(urls_para_visitar, start=1):
                detail_page = context.new_page()
                try:
                    detail_page.goto(url, timeout=30000)
                    detail_page.wait_for_selector('h1', timeout=10000)
                    
                    nome = detail_page.locator('h1').inner_text()
                    
                    phone_loc = detail_page.locator('button[data-item-id^="phone:tel:"]')
                    telefone = phone_loc.inner_text() if phone_loc.count() > 0 else ""
                    telefone = telefone.split('\n')[-1] if telefone else "Não informado"
                    
                    web_loc = detail_page.locator('a[data-item-id="authority"]')
                    website = web_loc.get_attribute('href') if web_loc.count() > 0 else "Não informado"
                    
                    leads_da_rodada.append({
                        "Nome": nome,
                        "Telefone": telefone,
                        "Website": website,
                        "Bairro/Busca": query,
                        "Link_Maps": url
                    })
                    print(f"[{index}/{len(urls_para_visitar)}] Novo lead capturado: {nome} | {telefone}")
                    
                    # Salva em memória instantaneamente para garantir cruzamento nulo na próxima busca
                    urls_ja_capturadas.add(url) 
                    
                except Exception as e:
                    print(f"[{index}/{len(urls_para_visitar)}] Falha ao processar.")
                finally:
                    detail_page.close()
                    time.sleep(1)

            page.close()

            # Salvar a rodada atual no arquivo gigante (Append Mode)
            if leads_da_rodada:
                df_novo = pd.DataFrame(leads_da_rodada)
                if os.path.exists(ARQUIVO_MESTRE):
                    df_novo.to_csv(ARQUIVO_MESTRE, mode='a', header=False, index=False, encoding="utf-8-sig")
                else:
                    df_novo.to_csv(ARQUIVO_MESTRE, mode='w', header=True, index=False, encoding="utf-8-sig")
                
                novos_leads_total += len(leads_da_rodada)
                print(f"-> {len(leads_da_rodada)} leads inseridos no banco mestre.")
            else:
                print(f"-> Todos os locais desta busca já estavam no seu banco de dados.")

        browser.close()
        print(f"\nOperação Concluída. {novos_leads_total} novos negócios adicionados ao banco da Volte.")

if __name__ == "__main__":
    # MATRIZ DE BUSCA (Alimente essa lista com quantos bairros quiser)
    fila_de_pesquisas = [
        "restaurantes no Centro, Curitiba",
        "hamburgueria no Centro, Curitiba",
        "pizzaria no Centro, Curitiba",
        "restaurantes no Batel, Curitiba",
        "hamburgueria no Batel, Curitiba",
        "pizzaria no Batel, Curitiba",
        "restaurantes no Água Verde, Curitiba",
        "bares no Água Verde, Curitiba"
    ]
    
    # max_por_busca define o teto por bairro. 
    # Como ele filtra repetidos, buscar 40 novos por termo vai encher o banco rápido.
    scrape_gmaps_em_massa(fila_de_pesquisas, max_por_busca=40)