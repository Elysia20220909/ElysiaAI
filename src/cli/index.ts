import { chat } from "../core/chatEngine";

const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  while (true) {
    await new Promise<void>((resolve) => {
      rl.question("> ", async (input: string) => {
        const reply = await chat(input);
        console.log("AI:", reply);
        resolve();
      });
    });
  }
}

main();
