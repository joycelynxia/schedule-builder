import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import readline from "readline";

const prisma = new PrismaClient();

// helper to prompt user for input
import process from "process";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=== Create Manager Account ===");

  const userName = await question("Username: ");
  const email = await question("Email: ");
  const password = await question("Password: ");

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Error: A user with that email already exists.");
    rl.close();
    return;
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Create manager
  const user = await prisma.user.create({
    data: {
      userName,
      email,
      password: hashed,
      isManager: true,
    },
  });

  console.log("✅ Manager account created successfully:");
  console.log(`- Username: ${user.userName}`);
  console.log(`- Email: ${user.email}`);
  rl.close();
}

main()
  .catch((err) => {
    console.error(err);
    rl.close();
  })
  .finally(() => prisma.$disconnect());
