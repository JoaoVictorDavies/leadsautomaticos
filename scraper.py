import time
import re
from playwright.sync_api import sync_playwright
from supabase import create_client, Client

# Chaves injetadas diretamente conforme sua configuração local
SUPABASE_URL = "https://ucwvaiawttazqndbqsyb.supabase.co"
SUPABASE_KEY = "sb_publishable_8xrSzalrUGHsDigjTNIY2g_Tvv-4eQT"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extrair_localizacao(query):
    nicho = query.split(" no ")[0].split(" em ")[0] if " no " in query or " em " in query else "Geral"
    cidade = query.split(",")[-1].strip() if "," in query else "Curitiba"
    bairro = "Desconhecido"
    match = re.search(r'(?:no|em)\s+([^,]+)', query)
    if match:
        bairro = match.group(1).strip()
    return nicho, bairro, cidade

def iniciar_motor_captura(buscas, max_por_busca):
    novos_leads_total = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        
        for query in buscas:
            nicho, bairro, cidade = extrair_localizacao(query)
            page = context.new_page()
            print(f"\n[>] Varrendo: {query}")
            page.goto(f"https://www.google.com/maps/search/{query.replace(' ', '+')}")
            
            try:
                page.wait_for_selector('div[role="feed"]', timeout=15000)
            except:
                print("[!] Sem resultados. Pulando.")
                page.close()
                continue

            urls_nesta_busca = set()
            tentativas_vazias = 0
            
            while len(urls_nesta_busca) < max_por_busca:
                links = page.locator('a[href*="/maps/place/"]').all()
                tamanho_anterior = len(urls_nesta_busca)
                
                for link in links:
                    href = link.get_attribute('href')
                    if href:
                        urls_nesta_busca.add(href)
                        if len(urls_nesta_busca) >= max_por_busca:
                            break
                
                if len(urls_nesta_busca) == tamanho_anterior:
                    tentativas_vazias += 1
                else:
                    tentativas_vazias = 0

                if tentativas_vazias > 3:
                    break

                page.evaluate('document.querySelector(\'div[role="feed"]\').scrollBy(0, 5000)')
                time.sleep(2)

            urls_para_visitar = list(urls_nesta_busca)[:max_por_busca]
            
            for index, url in enumerate(urls_para_visitar, start=1):
                detail_page = context.new_page()
                try:
                    detail_page.goto(url, timeout=30000)
                    detail_page.wait_for_selector('h1', timeout=10000)
                    
                    nome = detail_page.locator('h1').inner_text()
                    phone_loc = detail_page.locator('button[data-item-id^="phone:tel:"]')
                    telefone = phone_loc.inner_text().split('\n')[-1] if phone_loc.count() > 0 else "Não informado"
                    web_loc = detail_page.locator('a[data-item-id="authority"]')
                    website = web_loc.get_attribute('href') if web_loc.count() > 0 else "Não informado"
                    
                    lead_data = {
                        "nome": nome,
                        "telefone": telefone,
                        "website": website,
                        "bairro": bairro,
                        "cidade": cidade,
                        "nicho": nicho,
                        "link_maps": url,
                        "status": "Novo",
                        "observacao": ""
                    }
                    
                    # O upsert ignora duplicatas automaticamente via Supabase. Não trava a automação.
                    supabase.table("leads").upsert(lead_data, on_conflict="link_maps").execute()
                    print(f"[{index}/{len(urls_para_visitar)}] OK -> {nome}")
                    novos_leads_total += 1
                    
                except Exception as e:
                    print(f"[{index}/{len(urls_para_visitar)}] Falha ou Duplicado ignorado.")
                finally:
                    detail_page.close()
                    time.sleep(1)

            page.close()

        browser.close()
        print(f"\n[✓] Operação Concluída. {novos_leads_total} registros processados para a VOLTE.")