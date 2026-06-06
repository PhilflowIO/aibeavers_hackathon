import { runAgent } from "./agent.js";

/**
 * CLI-Einstieg.
 *
 *   pnpm agent "Lies meine letzten 5 Mails und fasse sie zusammen."
 *   pnpm agent "Lege am 12.06.2026 um 10:00 einen Folgetermin mit Herrn Berger an
 *               und schick ihm die Einladung an berger@example.de."
 *
 * Ohne Argument läuft eine kurze interaktive REPL.
 */

const arg = process.argv.slice(2).join(" ").trim();

async function once(prompt: string) {
  console.log(`\n🧑  ${prompt}\n`);
  const answer = await runAgent(prompt);
  console.log(`🤖  ${answer}\n`);
}

async function repl() {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(
    "Nacharbeits-Agent — gib eine Anweisung ein (oder 'exit' zum Beenden).\n"
  );
  while (true) {
    const line = (await rl.question("🧑  ")).trim();
    if (!line || line === "exit" || line === "quit") break;
    try {
      const answer = await runAgent(line);
      console.log(`🤖  ${answer}\n`);
    } catch (err) {
      console.error(`⚠️  ${(err as Error).message}\n`);
    }
  }
  rl.close();
}

(arg ? once(arg) : repl()).catch((err) => {
  console.error("Fehler:", (err as Error).message);
  process.exit(1);
});
