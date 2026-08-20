import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "Administrator",
        role: "ADMIN",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`[Seed] Created admin user: ${email}`);
  } else if (existing.role !== "ADMIN") {
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", isEmailVerified: true, emailVerifiedAt: new Date() },
    });
    console.log(`[Seed] Promoted ${email} to ADMIN`);
  }

  const demoUser = await prisma.user.findUnique({ where: { email: "demo@example.com" } });
  if (!demoUser) {
    await prisma.user.create({
      data: {
        email: "demo@example.com",
        passwordHash: await bcrypt.hash("Demo1234", 12),
        name: "Demo User",
        role: "USER",
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log("[Seed] Created demo user: demo@example.com / Demo1234");
  }

  const settingCount = await prisma.setting.count();
  if (settingCount === 0) {
    await prisma.setting.createMany({
      data: [
        { key: "app.name", value: "AI Knowledge Base", description: "Application display name" },
        { key: "app.maintenanceMode", value: false, description: "Maintenance mode toggle" },
        {
          key: "prompt.systemPrompt",
          value:
            "You are a helpful, accurate AI assistant for a knowledge base platform.\nAnswer the user's question strictly based on the provided context sections.\nIf the answer is not in the context, say you do not have enough information and never invent facts.\nUse markdown formatting for clarity. Keep answers concise and well-structured.",
          description: "System prompt template",
        },
        {
          key: "prompt.chatPrompt",
          value:
            "You are answering questions about the user's documents.\n\nCONTEXT:\n{context}\n\nCONVERSATION HISTORY:\n{history}\n\nQUESTION:\n{question}\n\nRules:\n1. Answer using ONLY the CONTEXT above. Cite sources inline like [1], [2] matching the numbers of each context block.\n2. If the CONTEXT does not contain the answer, respond that the information is not available in the documents.\n3. Be precise, use markdown, and keep a professional tone.",
          description: "Chat prompt template",
        },
      ],
    });
    console.log("[Seed] Inserted default settings");
  }

  console.log("[Seed] Done.");
}

main()
  .catch((error) => {
    console.error("[Seed] Failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
