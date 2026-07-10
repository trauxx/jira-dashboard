"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TicketPlus, Loader2 } from "lucide-react";

interface Props {
  config: JiraConfig;
  company: string;
}

const TICKET_LABEL = (company: string) => company === "ISA" ? "ISA" : "MB";

interface FormData {
  summary: string;
  description: string;
  projectKey: string;
  issueType: string;
  priority: string;
  product: string;
  environment: string;
  stepsToReproduce: string;
  whenHappened: string;
  affectedUser: string;
}

const PROJECTS: Record<string, { key: string; name: string }[]> = {
  ISA: [
    { key: "ISA", name: "ISA (Ingressos)" },
  ],
  MB: [
    { key: "MB", name: "MB (Meu Bilhete)" },
  ],
  SYSTEM: [
    { key: "MB", name: "MB (Meu Bilhete)" },
  ],
};

const PRODUCTS = [
  { name: "Site Meu Bilhete (meubilhete.com)", repo: "Site" },
  { name: "Site Ingresso SA", repo: "SiteIngressoSA" },
  { name: "API de Tickets", repo: "tickets-apiv2" },
  { name: "Site de Tickets", repo: "tickets-sitev2" },
  { name: "Dashboard de Tickets", repo: "tickets-dashboard" },
  { name: "Painel Administrativo", repo: "Painel" },
  { name: "App Produtor", repo: "tickets-appprodutor" },
  { name: "App Vendas", repo: "app-vendas-v2" },
  { name: "App Catracas", repo: "appValidacaoCatracas" },
  { name: "App Reconhecimento Facial", repo: "appValidacaoNFCFacial" },
  { name: "PDV (Ponto de Venda)", repo: "Pdv" },
  { name: "PDV Flutter", repo: "Pdv2" },
  { name: "Controlador", repo: "Controlador" },
  { name: "Dashboard", repo: "dashboardv3" },
  { name: "Delivery", repo: "delivery" },
  { name: "App Relatorios", repo: "appRelatorios" },
  { name: "App Times", repo: "app-times" },
  { name: "Whatsapp Bot", repo: "whatsapp-bot" },
  { name: "Infraestrutura", repo: "terraform" },
  { name: "Aws API", repo: "Aws" },
  { name: "Outro", repo: "" },
];

export default function TicketCreator({ config, company }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    summary: "",
    description: "",
    projectKey: PROJECTS[company]?.[0]?.key ?? "MB",
    issueType: "Task",
    priority: "Medium",
    product: "",
    environment: "",
    stepsToReproduce: "",
    whenHappened: "",
    affectedUser: "",
  });

  const steps = [
    {
      title: "Produto",
      description: "Qual produto esta com problema?",
      field: "product" as const,
      type: "select" as const,
      options: PRODUCTS.map((p) => p.name),
    },
    {
      title: "Ambiente",
      description: "Em qual ambiente ocorre?",
      field: "environment" as const,
      type: "select" as const,
      options: ["Producao", "Homologacao", "Desenvolvimento", "Outro"],
    },
    {
      title: "Resumo",
      description: "Um titulo resumido para o ticket",
      field: "summary" as const,
      type: "input" as const,
    },
    {
      title: "Descricao",
      description: "Descreva detalhadamente o problema",
      field: "description" as const,
      type: "textarea" as const,
    },
    {
      title: "Passo a passo",
      description: "Como reproduzir o problema?",
      field: "stepsToReproduce" as const,
      type: "textarea" as const,
    },
    {
      title: "Quando aconteceu?",
      description: "Quando e como o problema ocorreu?",
      field: "whenHappened" as const,
      type: "textarea" as const,
    },
    {
      title: "Usuario / PDV",
      description: "Qual usuario ou PDV esta afetado? (se aplicavel)",
      field: "affectedUser" as const,
      type: "input" as const,
    },
    {
      title: "Tipo e Prioridade",
      description: "Classifique o ticket",
      fields: [
        { field: "issueType" as const, type: "select" as const, label: "Tipo", options: ["Task", "Bug", "Story", "Epic"] },
        { field: "priority" as const, type: "select" as const, label: "Prioridade", options: ["Low", "Medium", "High", "Highest"] },
      ],
    },
  ];

  const handleSubmit = async () => {
    if (!form.summary) {
      toast({ title: "Resumo é obrigatório", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const fullDescription = [
        form.description,
        `\n---\n**Produto:** ${form.product}`,
        `**Ambiente:** ${form.environment}`,
        `**Passo a passo:**\n${form.stepsToReproduce}`,
        `**Quando aconteceu:**\n${form.whenHappened}`,
        form.affectedUser ? `**Usuário/PDV:** ${form.affectedUser}` : "",
        `**Company:** ${company}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const labels = [TICKET_LABEL(company)];

      const res = await fetch("/api/jira/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: form.summary,
          description: fullDescription,
          projectKey: form.projectKey,
          issueType: form.issueType,
          priority: form.priority,
          labels,
          config,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar ticket");
      }

      toast({
        title: `Ticket ${data.key} criado com sucesso!`,
        description: (
          <a
            href={data.browseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Abrir no Jira
          </a>
        ),
      });

      setOpen(false);
      setStep(0);
      setForm({
        summary: "",
        description: "",
        projectKey: PROJECTS[company]?.[0]?.key ?? "MB",
        issueType: "Task",
        priority: "Medium",
        product: "",
        environment: "",
        stepsToReproduce: "",
        whenHappened: "",
        affectedUser: "",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar ticket",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const s = steps[step];
    if (!s) return null;

    if ("fields" in s && Array.isArray(s.fields)) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </div>
          {s.fields.map((f) => (
            <div key={f.field} className="space-y-2">
              <Label>{f.label}</Label>
              {f.type === "select" ? (
                <Select
                  value={form[f.field]}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, [f.field]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          ))}
        </div>
      );
    }

    if ("field" in s) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </div>
          <div className="space-y-2">
            {s.type === "input" && (
              <Input
                value={form[s.field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [s.field]: e.target.value }))}
                placeholder={s.field === "summary" ? "Ex: Erro ao gerar relatório de vendas" : ""}
              />
            )}
            {s.type === "textarea" && (
              <Textarea
                value={form[s.field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [s.field]: e.target.value }))}
                rows={4}
                placeholder={
                  s.field === "stepsToReproduce"
                    ? "1. Acesse a tela X\n2. Clique em Y\n3. O erro aparece..."
                    : s.field === "whenHappened"
                    ? "Desde a última atualização, por volta das 14h..."
                    : ""
                }
              />
            )}
            {s.type === "select" && (
              <Select
                value={form[s.field]}
                onValueChange={(v) => setForm((prev) => ({ ...prev, [s.field]: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {s.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const isLastStep = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <TicketPlus className="h-4 w-4" />
        Novo Ticket
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step < steps.length ? steps[step]?.title : "Revisão"}
            </DialogTitle>
            <DialogDescription>
              {step < steps.length
                ? steps[step]?.description
                : "Revise as informações antes de criar o ticket"}
            </DialogDescription>
          </DialogHeader>

          <div className="w-full bg-secondary rounded-full h-1.5 mb-4">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="min-h-[250px]">
            {step < steps.length ? (
              renderStep()
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-secondary/50 p-3 space-y-2">
                  <p><strong>Produto:</strong> {form.product}</p>
                  <p><strong>Ambiente:</strong> {form.environment}</p>
                  <p><strong>Resumo:</strong> {form.summary}</p>
                  <p><strong>Tipo:</strong> {form.issueType}</p>
                  <p><strong>Prioridade:</strong> {form.priority}</p>
                  <p><strong>Label:</strong> {TICKET_LABEL(company)}</p>
                  <p><strong>Descrição:</strong> {form.description}</p>
                  <p><strong>Passo a passo:</strong> {form.stepsToReproduce}</p>
                  <p><strong>Quando aconteceu:</strong> {form.whenHappened}</p>
                  {form.affectedUser && (
                    <p><strong>Usuário/PDV:</strong> {form.affectedUser}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                disabled={loading}
              >
                Voltar
              </Button>
            )}
            {isLastStep && step < steps.length && (
              <Button
                variant="outline"
                onClick={() => setStep(steps.length)}
                disabled={loading}
              >
                Revisar
              </Button>
            )}
            {step < steps.length && !isLastStep && (
              <Button onClick={() => setStep((s) => s + 1)} disabled={loading}>
                Próximo
              </Button>
            )}
            {step >= steps.length && (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  `Criar Ticket`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
