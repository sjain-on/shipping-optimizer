import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "insightful-eagerness";
export default defineRailway(() => {
  const api = service("api", {
    source: github("sjain-on/shipping-optimizer", { branch: "main", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile.api" },
    replicas: { "iad": 1 },
    healthcheckPath: "/health",
    healthcheckTimeout: 30,
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 10,
    variables: {
      NODE_ENV: "production",
      PORT: "3001",
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
      ADMIN_API_KEY: "${{ADMIN_API_KEY}}",
      SHOPIFY_API_SECRET: "${{SHOPIFY_API_SECRET}}",
      SHOPIFY_WEBHOOK_SECRET: "${{SHOPIFY_WEBHOOK_SECRET}}",
      EASYECOM_API_KEY: "${{EASYECOM_API_KEY}}",
      EASYECOM_WEBHOOK_SECRET: "${{EASYECOM_WEBHOOK_SECRET}}",
      QUICKSHIFT_API_KEY: "${{QUICKSHIFT_API_KEY}}",
      QUICKSHIFT_WEBHOOK_SECRET: "${{QUICKSHIFT_WEBHOOK_SECRET}}",
    },
  });

  const worker = service("worker", {
    source: github("sjain-on/shipping-optimizer", { branch: "main", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile.worker" },
    replicas: { "iad": 1 },
    healthcheckPath: "/health",
    healthcheckTimeout: 30,
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 10,
    variables: {
      NODE_ENV: "production",
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
      ADMIN_API_KEY: "${{ADMIN_API_KEY}}",
      SHOPIFY_API_SECRET: "${{SHOPIFY_API_SECRET}}",
      SHOPIFY_WEBHOOK_SECRET: "${{SHOPIFY_WEBHOOK_SECRET}}",
      EASYECOM_API_KEY: "${{EASYECOM_API_KEY}}",
      EASYECOM_WEBHOOK_SECRET: "${{EASYECOM_WEBHOOK_SECRET}}",
      QUICKSHIFT_API_KEY: "${{QUICKSHIFT_API_KEY}}",
      QUICKSHIFT_WEBHOOK_SECRET: "${{QUICKSHIFT_WEBHOOK_SECRET}}",
    },
  });

  const admin = service("admin", {
    source: github("sjain-on/shipping-optimizer", { branch: "main", checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile.admin" },
    replicas: { "iad": 1 },
    healthcheckPath: "/health",
    healthcheckTimeout: 30,
    restartPolicyType: "ON_FAILURE",
    restartPolicyMaxRetries: 10,
    variables: {
      NODE_ENV: "production",
      PORT: "3000",
      NEXT_PUBLIC_ADMIN_API_KEY: "${{ADMIN_API_KEY}}",
      DATABASE_URL: "${{Postgres.DATABASE_URL}}",
    },
  });

  return project("Shipping Optimizer", {
    variables: { managed: true },
    resources: [api, worker, admin],
  });
});