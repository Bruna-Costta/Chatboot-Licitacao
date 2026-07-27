from src import RequestApiIA
from dotenv import load_dotenv
import os
import telebot

load_dotenv()

bot = telebot.TeleBot(os.getenv("API_TOKEN_TELEGRAM"))

ia_request = RequestApiIA()

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "Olá! Sou um assistente de IA especializado em Licitações e Contratos Administrativos. Envie-me uma pergunta sobre licitações públicas, e eu responderei de forma objetiva e simplificada.")


@bot.message_handler(func=lambda message: True)
def handle_message(message):
    user_prompt = message.text
    bot.reply_to(message, "Processando sua solicitação. Por favor, aguarde...")
    bot.send_chat_action(message.chat.id, 'typing')  # Indicate that the bot is typing
    response = ia_request.request_ia(user_prompt)
    if "error" in response:
        bot.reply_to(message, f"Erro: {response['error']}")
    else:
        bot.reply_to(message, response)

    bot.send_chat_action(message.chat.id, 'cancel')  # Stop indicating typing    


print("Bot iniciado. Aguardando mensagens...")
bot.infinity_polling()