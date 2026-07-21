interface CompanyConfig {
  apiUrl: string;
  origin: string;
  boardId: string;
  projectKey: string;
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
  },
  meubilhete: {
    apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
    origin:
      process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
    boardId: process.env.JIRA_BOARD_ID || "1",
    projectKey: "MB",
  },
};

const DEFAULT_CONFIG: CompanyConfig = {
  apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
  origin:
    process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
  boardId: process.env.JIRA_BOARD_ID || "1",
  projectKey: "MB",
};

export function getApiConfig(host: string): CompanyConfig {
  for (const [key, config] of Object.entries(COMPANY_CONFIG)) {
    if (host.includes(key)) return config;
  }
  return DEFAULT_CONFIG;
}
