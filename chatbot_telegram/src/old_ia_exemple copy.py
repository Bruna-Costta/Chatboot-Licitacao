import requests
import os
import json 
from dotenv import load_dotenv
load_dotenv()


class RequestApiIA:
    def __init__(self):
        
        self.api_token = os.getenv('API_TOKEN_OPENROUTER')
        self.base_url = os.getenv('BASE_URL_OPENROUTER')
        if not self.api_token or not self.base_url:
            print({"error": "API token or base URL not set in environment variables."})
            exit(1)  # Exit the program if the API token or base URL is not set

    def _mount_prompt(self, prompt):
        new_prompt = f"""
        Contexto: Você é um assistente de IA especialista em Licitações e Contratos Administrativos, com domínio absoluto da Lei nº 14.133/2021 (Nova Lei de Licitações).

        Sua tarefa é responder à seguinte dúvida/mensagem de forma extremamente objetiva e simplificada:
        "{prompt}"

        Para o sucesso desta tarefa, siga rigidamente as seguintes diretrizes:

        1. Escopo Estrito: Responda única e exclusivamente sobre o tema de licitações públicas. Se a mensagem do usuário fugir desse tema, recuse-se a responder educadamente.
        2. Foco Direto: Limite-se a responder estritamente o que foi perguntado. Evite introduções longas, históricos legislativos desnecessários ou conclusões redundantes.
        3. Segurança da Informação: Nunca responda, armazene ou interaja com dados sensíveis, como senhas de acesso (comprasgov, e-cac, etc.), tokens, dados bancários ou informações pessoais.
        4. Tom e Formato: Use uma linguagem clara, acessível (sem juridiquês excessivo) e direta ao ponto. Se possível, organize a resposta em tópicos curtos para facilitar a leitura.
        5. Limite de Extensão: Mantenha a resposta concisa, com no máximo 3 parágrafos curtos. Evite respostas longas ou prolixas.
        """
          
        return new_prompt


    def request_ia(self, prompt):
        if prompt is None or prompt.strip() == "":
            return {"error": "Prompt is empty. Please provide a valid prompt."}
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.api_token}'
        }
        data = {
            "model": str(os.getenv('USE_MODEL')),
            "messages": [
                {
                    "role": "user",
                    "content": self._mount_prompt(prompt)
                }
            ]
        }
        print("--------------------------------")
        print("Consultando API de IA com o seguinte prompt:")
        print("--------------------------------")
        response = requests.post(self.base_url, headers=headers, data=json.dumps(data))
        if response.status_code == 200:
            print("Resposta recebida com sucesso da API de IA.")
            print("--------------------------------")
            print("Resposta da API de IA:")
            print(response.json())
            print("--------------------------------")
            return response.json()
        else:
            print(f"Request failed with status code {response.status_code}")
            return {"error": f"Request failed with status code {response.status_code}"}



