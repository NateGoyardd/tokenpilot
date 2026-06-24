const fs = require("fs");
const path = require("path");

function loadCommands() {
  const commandsPath = path.join(__dirname, "..", "commands");
  const files = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

  const commands = new Map();

  for (const file of files) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) {
      continue;
    }

    commands.set(command.data.name, command);
  }

  return commands;
}

module.exports = { loadCommands };
