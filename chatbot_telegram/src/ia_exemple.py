# import requests
import os
import json 
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()



class RequestApiIA:
    def __init__(self):
        
        self.api_token = os.getenv('DEEPSEEK_API_KEY')
        self.base_url = os.getenv('DEEPSEEK_BASE_URL')
        self.model = os.getenv('USE_MODEL')
        if not self.api_token or not self.base_url:
            print({"error": "API token or base URL not set in environment variables."})
            exit(1)  # Exit the program if the API token or base URL is not set

        self.client = OpenAI(api_key=self.api_token, base_url=self.base_url)

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
        
        print("--------------------------------")
        print("Consultando a API de IA:")
        print("--------------------------------")
    
        try:
            
            response  = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": self._mount_prompt(prompt)
                    }
                ],
                stream=False,
                reasoning_effort="high",
                extra_body={"thinking": {"type": "enabled"}}
            )

            print("--------------------------------")
            print("Resposta recebida com sucesso da API de IA.")
            print("--------------------------------")
            print("Resposta da API de IA:")
            print(response.choices[0].message.content)
            print("--------------------------------")
            return response.choices[0].message.content
        except Exception as e:
            print(f"Request failed with error: {str(e)}")
            return {"error": f"Request failed with error: {str(e)}"}

        
        




if __name__ == "__main__":
    # Test the RequestApiIA class
    ia_request = RequestApiIA()
    test_prompt = "Explique o processo de licitação pública de forma resumida."
    response = ia_request.request_ia(test_prompt)
    print("Response from API:", json.dumps(response))

    
