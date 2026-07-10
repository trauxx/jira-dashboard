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

const TICKET_LABEL = (company: string) => (company === "ISA" ? "ISA" : "MB");

interface Message {
  role: "user" | "assistant";
  content: string;
}

function extractJSON(text: string): Record<string, string> | null {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : text;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function buildTicketDescription(data: Record<string, string>): string {
  return [
    data.descricao || "",
    data.produto ? `\n\n**Produto:** ${data.produto}` : "",
    data.empresa ? `**Empresa:** ${data.empresa}` : "",
    data.passo_a_passo ? `**Passo a passo:**\n${data.passo_a_passo}` : "",
    data.quando ? `**Quando:** ${data.quando}` : "",
    data.usuario ? `**Usuário/PDV:** ${data.usuario}` : "",
    data.tipo ? `**Tipo:** ${data.tipo}` : "",
    data.prioridade ? `**Prioridade:** ${data.prioridade}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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
          content: `Olá! 👋 O que você precisa registrar? Pode ser um **bug**, uma **melhoria** ou uma **nova funcionalidade**. Conte o que você precisa.`,
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

    const updatedMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const label = TICKET_LABEL(company);
      const isIsa = company === "ISA";

      const systemPrompt = `Você é um assistente de criação de tickets Jira.

## REGRAS INICIAIS
- Pergunte primeiro se é **bug**, **melhoria** ou **nova funcionalidade**.
- Se for **bug**, siga o template de bug abaixo.
- Se for **melhoria** ou **nova funcionalidade**, siga o template de melhoria/feature abaixo.
- Ambiente é sempre **produção** — não pergunte sobre ambiente.

## LABEL
A label do ticket será "${label}" (definida pela pagina).${isIsa ? "" : "\n- Pergunte apenas para registro: e MB ou outra empresa?"}

## TEMPLATE BUG
- Produto(s): [qual produto? qual repositório?]
${isIsa ? "" : "- Empresa: [MB ou outra empresa?]"}
- Descrição: [o que acontece?]
- Passo a passo: [como reproduzir?]
- Quando aconteceu: [desde quando?]
- Usuário/PDV afetado: [quem? opcional]
- Prioridade: [Baixa, Média, Alta, Crítica]

## TEMPLATE MELHORIA / NOVA FUNCIONALIDADE
- Produto(s): [qual produto? qual repositório?]
${isIsa ? "" : "- Empresa: [MB ou outra empresa?]"}
- Descrição: [o que é a melhoria/feature?]
- Benefício esperado: [qual o ganho?]
- Público afetado: [quem será impactado?]
- Prioridade: [Baixa, Média, Alta, Crítica]

## REGRAS GERAIS
- Uma pergunta de cada vez.
- Se o usuário já forneceu informações suficientes, mostre o resumo e peça autorização.
- Quando autorizado, responda apenas: CRIAR_TICKET seguido de um JSON válido SEM markdown, com estes campos:
  - obrigatórios: summary, descricao, produto${isIsa ? "" : ", empresa"}, tipo, prioridade
  - bug: passo_a_passo, quando
  - usuario (opcional)
  - melhoria/feature: beneficio, publico_afetado
- NÃO use \`\`\`json — retorne apenas CRIAR_TICKET { ... }.
- Seja direto e responda em português.`;

      const res = await fetch("/api/jira/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages,
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar");

      const reply = (data.message || "").trim();

      if (reply.includes("CRIAR_TICKET")) {
        const jsonPart = reply.replace(/.*CRIAR_TICKET\s*/, "").trim();
        const ticketData = extractJSON(jsonPart);

        if (!ticketData) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `❌ Erro ao interpretar os dados do ticket. Tente novamente.\n\nResposta recebida:\n${reply}`,
            },
          ]);
          setLoading(false);
          return;
        }

        const createRes = await fetch("/api/jira/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: ticketData.summary || text.slice(0, 80),
            description: buildTicketDescription(ticketData),
            projectKey: isIsa ? "ISA" : "MB",
            issueType: ticketData.tipo === "bug" || ticketData.tipo?.toLowerCase() === "bug"
              ? "Bug"
              : ticketData.tipo === "melhoria"
              ? "Story"
              : "Task",
            priority: ticketData.prioridade === "Crítica" || ticketData.prioridade === "Alta"
              ? "High"
              : ticketData.prioridade === "Média"
              ? "Medium"
              : "Low",
            labels: [label],
            config,
          }),
        });

        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error || "Erro ao criar ticket");

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
        { role: "assistant", content: `❌ Erro: ${err.message}` },
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
    window.open(
      `${baseUrl}/?model=jira-ticket-bot&prompt=${encodeURIComponent(
        `Criar ticket para ${company}: ${messages.find((m) => m.role === "user")?.content || ""}`
      )}`,
      "_blank"
    );
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
              Conte o que precisa. Se faltar informação, eu pergunto.
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
                    <div className="mt-2">
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
              placeholder="Descreva o que precisa..."
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
