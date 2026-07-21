const COMPANY_CONFIG: Record<string, { apiUrl: string; origin: string }> = {
  ingressosa: {
    apiUrl:
      process.env.TICKETS_API_URL_ISA ||
      "https://api.ingressosa.acessofacil.com/v2",
    origin:
      process.env.TICKETS_COMPANY_ORIGIN_ISA || "https://ingressosa.com",
  },
  meubilhete: {
    apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
    origin:
      process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
  },
};

const DEFAULT_CONFIG = {
  apiUrl: process.env.TICKETS_API_URL || "https://api.acessofacil.com/v2",
  origin:
    process.env.TICKETS_COMPANY_ORIGIN || "https://meubilhete.com.br",
};

export function getApiConfig(host: string) {
  for (const [key, config] of Object.entries(COMPANY_CONFIG)) {
    if (host.includes(key)) return config;
  }
  return DEFAULT_CONFIG;
}
