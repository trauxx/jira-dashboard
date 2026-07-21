interface CompanyConfig {
  apiUrl: string;
  origin: string;
  boardId: string;
  projectKey: string;
  capacity: number;
}

const COMPANY_CONFIG: Record<string, CompanyConfig> = {
  ingressosa: {
    apiUrl:
      process.env.TICKETS_API_URL_ISA ||
      "https://api.ingressosa.acessofacil.com/v2",
    origin:
      process.env.TICKETS_COMPANY_ORIGIN_ISA || "https://ingressosa.com",
    boardId: process.env.JIRA_BOARD_ID_ISA || "201",
    projectKey: "ISA",
    capacity: Number(process.env.JIRA_CAPACITY_ISA) || 0,
  },
  meubilhete: {
    apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
    origin:
      process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
    boardId: process.env.JIRA_BOARD_ID || "1",
    projectKey: "MB",
    capacity: Number(process.env.JIRA_CAPACITY) || 227,
  },
};

const DEFAULT_CONFIG: CompanyConfig = {
  apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
  origin:
    process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
  boardId: process.env.JIRA_BOARD_ID || "1",
  projectKey: "MB",
  capacity: Number(process.env.JIRA_CAPACITY) || 227,
};

export function getApiConfig(host: string): CompanyConfig {
  for (const [key, config] of Object.entries(COMPANY_CONFIG)) {
    if (host.includes(key)) return config;
  }
  return DEFAULT_CONFIG;
}
