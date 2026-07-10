"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { JiraConfig } from "@/types/jira";
import { toast } from "@/hooks/use-toast";
import { TicketPlus, Loader2, Send, User, Bot, ExternalLink } from "lucide-react";

interface Props {
  config: JiraConfig;
  company: string;
}

const TICKET_LABEL = (company: string) => company === "ISA" ? "ISA" : "MB";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TicketCreator({ config, company }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([
        {
          role: "assistant",
          content: `Olá! 👋 Descreva o problema ou solicitação que você quer registrar. Pode incluir o que souber — título, descrição, produto, etc. Se faltar alguma informação, eu vou te perguntando aos poucos.`,
        },
      ]);
      setTicketCreated(false);
      setTicketUrl("");
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const allMessages = [...messages, { role: "user" as const, content: text }];
      const conversation = allMessages
        .map((m) => `${m.role === "user" ? "Usuario" : "Sistema"}: ${m.content}`)
        .join("\n\n");

      const label = TICKET_LABEL(company);
      const systemPrompt = `Você é um assistente de criação de tickets Jira. 

Seguindo o template abaixo, colete as informações que faltam perguntando uma de cada vez.

## TEMPLATE PADRÃO
- Produto(s): [qual produto? qual repositório? Ex: site, PDV, app, API, painel]
- Empresa: [ISA ou qualquer outra]
- Ambiente: [produção, homologação, desenvolvimento]
- Descrição: [o que acontece?]
- Passo a passo: [como reproduzir?]
- Quando aconteceu: [desde quando? em que circunstâncias?]
- Usuário/PDV afetado: [quem? opcional]
- Tipo: [Bug, Task, Story, Melhoria]
- Prioridade: [Baixa, Média, Alta, Crítica]

## REGRAS
- Se o usuário já forneceu informações suficientes, confirme o resumo e peça autorização.
- Se faltar algo, pergunte APENAS UMA coisa por vez.
- Seja direto e objetivo em português.
- Quando autorizado, responda exatamente: CRIAR_TICKET seguido de um JSON válido com os campos: summary, descricao, produto, empresa, ambiente, passo_a_passo, quando, usuario, tipo, prioridade.
- Use a label "${label}" para o ticket.
- Empresa "ISA" → label ISA. Qualquer outra → label MB.`;

      const res = await fetch("/api/jira/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...allMessages,
          ],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar");
      }

      const reply = data.message || data.response || "Entendi, pode me contar mais?";

      if (reply.startsWith("CRIAR_TICKET")) {
        const jsonStr = reply.replace("CRIAR_TICKET", "").trim();
        let ticketData: Record<string, string> = {};
        try {
          ticketData = JSON.parse(jsonStr);
        } catch {
          ticketData = { summary: text };
        }

        const createRes = await fetch("/api/jira/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: ticketData.summary || text.slice(0, 80),
            description: [
              ticketData.descricao || text,
              ticketData.produto ? `\n\n**Produto:** ${ticketData.produto}` : "",
              ticketData.empresa ? `**Empresa:** ${ticketData.empresa}` : "",
              ticketData.ambiente ? `**Ambiente:** ${ticketData.ambiente}` : "",
              ticketData.passo_a_passo ? `**Passo a passo:**\n${ticketData.passo_a_passo}` : "",
              ticketData.quando ? `**Quando:** ${ticketData.quando}` : "",
              ticketData.usuario ? `**Usuário/PDV:** ${ticketData.usuario}` : "",
            ].filter(Boolean).join("\n"),
            projectKey: TICKET_LABEL(company) === "ISA" ? "ISA" : "MB",
            issueType: ticketData.tipo || "Task",
            priority: ticketData.prioridade || "Medium",
            labels: [TICKET_LABEL(company)],
            config,
          }),
        });

        const createData = await createRes.json();

        if (!createRes.ok) {
          throw new Error(createData.error || "Erro ao criar ticket");
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Ticket **${createData.key}** criado com sucesso!\n\n[Abrir no Jira](${createData.browseUrl})`,
          },
        ]);
        setTicketCreated(true);
        setTicketUrl(createData.browseUrl);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Erro: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openInOpenWebUI = () => {
    const baseUrl = "http://44.195.169.137:3000";
    const modelId = "jira-creator";
    const prompt = encodeURIComponent(
      `Criar um ticket para ${company} sobre: ${messages.find((m) => m.role === "user")?.content || ""}`
    );
    window.open(`${baseUrl}/?model=${modelId}&prompt=${prompt}`, "_blank");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <TicketPlus className="h-4 w-4" />
        Novo Ticket
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
            <DialogDescription>
              Conte o que precisa e eu vou te ajudando a criar o ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {msg.content}
                  {ticketCreated && msg.role === "assistant" && i === messages.length - 1 && (
                    <div className="mt-2 flex gap-2">
                      <a
                        href={ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir no Jira
                      </a>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-end gap-2 border-t pt-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o problema ou solicitação..."
              rows={2}
              className="resize-none"
              disabled={loading || ticketCreated}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || loading || ticketCreated}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {ticketCreated && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Fechar
              </Button>
              <Button onClick={openInOpenWebUI}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no Open WebUI
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
