import { Client, GatewayIntentBits } from "discord.js";
import config from "./config.js";
import iniciar from "./comandos/iniciar.js";
import partidaCommand from "./comandos/partida.js";

// 🔴 Mapa global de partidas por servidor
const partidasPorServidor = new Map();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// ✅ Corrigido: evento atualizado para evitar depreciação
client.once("clientReady", () => {
  console.log(`${config.botName} está online!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.prefix)) return;

  const comando = message.content.slice(config.prefix.length).trim();
  const guildId = message.guild.id;
  const estado = partidasPorServidor.get(guildId);

  // 🔹 Limpeza automática de partidas órfãs
  if (estado && estado.gameMessage && !estado.gameMessage.channel) {
    partidasPorServidor.delete(guildId);
  }

  // 🔹 Iniciar partida com inscrições
  if (comando === "iniciar") {
    if (partidasPorServidor.has(guildId)) {
      return message.channel.send("⚠️ | Já existe uma partida acontecendo neste servidor!");
    }

    try {
      const { collector, getPartidaIniciada, parar, gameMessage } = await iniciar(
        message,
        client,
        (jogadores) => {
          partidaCommand(message, client, () => {
            partidasPorServidor.delete(guildId);
          }, jogadores);
        }
      );

      partidasPorServidor.set(guildId, {
        collector,
        getPartidaIniciada,
        parar,
        gameMessage
      });
    } catch (err) {
      partidasPorServidor.delete(guildId);
      message.channel.send("❌ | Ocorreu um erro ao iniciar a partida.");
      console.error(err);
    }
  }

  // 🔹 Parar partida antes de começar
  if (comando === "parar") {
    const estado = partidasPorServidor.get(guildId);

    if (!estado) {
      return message.channel.send("⚠️ | Nenhuma partida ativa neste servidor.");
    }

    if (!estado.gameMessage || !estado.gameMessage.channel) {
      partidasPorServidor.delete(guildId);
      return message.channel.send("ℹ️ | A partida anterior foi apagada, estado limpo. Pode iniciar outra!");
    }

    if (estado.getPartidaIniciada && !estado.getPartidaIniciada()) {
      await estado.parar();
      partidasPorServidor.delete(guildId);
      return;
    } else {
      return message.channel.send("⚠️ | A partida já começou, não pode ser abortada.");
    }
  }

  // 🔹 Testar partida imediata só com você
  if (comando === "testar") {
    if (partidasPorServidor.has(guildId)) {
      return message.channel.send("⚠️ Já existe uma partida acontecendo neste servidor!");
    }

    try {
      const jogadores = [message.author];
      partidaCommand(message, client, () => {
        partidasPorServidor.delete(guildId);
      }, jogadores);

      partidasPorServidor.set(guildId, { getPartidaIniciada: () => true });
    } catch (err) {
      partidasPorServidor.delete(guildId);
      message.channel.send("❌ Ocorreu um erro ao iniciar o teste.");
      console.error(err);
    }
  }
});

client.login(config.token);