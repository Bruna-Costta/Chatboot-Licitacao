export default function SobrePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background px-16 py-12 text-justify">
      <h1 className="text-2xl font-semibold text-foreground">
        Sobre o projeto
      </h1>

      <p className="mt-8 max-w-3xl text-base leading-relaxed text-foreground/80">
        Este assistente foi desenvolvido para apoiar equipes de compras públicas
        no esclarecimento de dúvidas sobre licitações e contratações. A partir
        de uma triagem inicial do assunto, o chatbot direciona a conversa para
        respostas objetivas com base na legislação vigente, ajudando a agilizar
        decisões e reduzir erros no processo licitatório.
      </p>
      <div className="mt-10 border-r-4">
        <img
          src={
            "https://datas.mg.gov.br/site/wp-content/uploads/2024/04/licita-600x338.jpeg"
          }
        />
      </div>
    </div>
  )
}
