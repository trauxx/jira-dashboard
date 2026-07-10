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
} from "@/components/ui/dialog";
import { TicketPlus, Loader2, Send, User, Bot, ExternalLink } from "lucide-react";

interface Props {
  company: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TicketCreator({ company }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketUrl, setTicketUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMessages([{
        role: "assistant",
        content: `👋 O que você precisa registrar? É um **bug**, uma **melhoria** ou uma **nova funcionalidade**?`,
      }]);
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
      const label = company === "ISA" ? "ISA" : "MB";
      const isIsa = company === "ISA";

      const systemPrompt = `Você é um assistente de criação de tickets Jira.

## CREDENCIAIS JIRA (use nas chamadas de API)
JIRA_DOMAIN=isa-meubilhete.atlassian.net
JIRA_EMAIL=leonardocastro.consultor@gmail.com
JIRA_TOKEN=${process.env.NEXT_PUBLIC_JIRA_TOKEN || "consulte o administrador"}

## REGRAS
1. Primeiro pergunte: é **bug**, **melhoria** ou **nova funcionalidade**?
2. Ambiente é sempre **produção**.
3. A label do ticket será "${label}".
${isIsa ? "" : "4. Pergunte apenas para registro: é MB ou outra empresa?"}
4. Uma pergunta de cada vez.

## COLETA POR TIPO

### BUG:
- Produto(s)?, ${isIsa ? "" : "Empresa?, "}Descrição?, Passo a passo?, Quando começou?, Usuário/PDV? (opcional), Prioridade? (Baixa/Média/Alta/Crítica)

### MELHORIA / NOVA FUNCIONALIDADE:
- Produto(s)?, ${isIsa ? "" : "Empresa?, "}Descrição?, Benefício esperado?, Público afetado?, Prioridade? (Baixa/Média/Alta/Crítica)

## CRIAÇÃO DO TICKET
Quando o usuário autorizar, execute Python para criar o ticket via API Jira.
Use requests e HTTPBasicAuth. Crie a issue e mostre o link.

Responda em português.`;

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

      if (data.ticket) {
        setTicketUrl(data.ticket.url);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
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
            <DialogDescription>Conte o que precisa. O assistente cria o ticket.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {msg.content}
                  {ticketUrl && msg.role === "assistant" && i === messages.length - 1 && (
                    <div className="mt-2">
                      <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline">
                        <ExternalLink className="h-3 w-3" /> Abrir no Jira
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
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva o que precisa..." rows={2} className="resize-none"
              disabled={loading || !!ticketUrl}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || loading || !!ticketUrl}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
