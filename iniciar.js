import { EmbedBuilder } from "discord.js";

export default async function iniciar(message, client, iniciarPartida) {
  const duracao = 30;
  let tempo = duracao;
  let partidaIniciada = false;
  let interval = null;

  const jogadores = [message.author];

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("🔰 | Vamos iniciar:")
    .setDescription(
      `⏰ Tempo para a próxima partida:\n**Esperando outros jogadores**\n\n👥 Jogadores:\n**[Jogador1]** = ${message.author.toString()}\n\nAdicione a reação 🎮 para jogar`
    );

  const gameMessage = await message.channel.send({ embeds: [embed] });
  await gameMessage.react("🎮");

  const filter = (reaction, user) => reaction.emoji.name === "🎮" && !user.bot;
  const collector = gameMessage.createReactionCollector({ filter });

  collector.on("collect", (reaction, user) => {
    if (!jogadores.find(j => j.id === user.id)) {
      jogadores.push(user);
    }

    const listaJogadores = jogadores
      .map((j, i) => `**[Jogador${i + 1}]** = ${j.toString()}`)
      .join("\n");

    if (!partidaIniciada && jogadores.length >= 2) {
      partidaIniciada = true;

      interval = setInterval(() => {
        if (tempo > 1) {
          tempo--;
          const novoEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Vamos iniciar:")
            .setDescription(
              `⏰ Tempo para a próxima partida:\n**${tempo} segundos**\n\n👥 Jogadores:\n${listaJogadores}`
            );
          gameMessage.edit({ embeds: [novoEmbed] });
        } else {
          clearInterval(interval);
          collector.stop();

          const finalEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("Vamos iniciar:")
            .setDescription(
              `⏰ Tempo para a próxima partida:\n**Partida começou!**\n\n👥 Jogadores:\n${listaJogadores}`
            );

          gameMessage.edit({ embeds: [finalEmbed] });
          message.channel.send("✅ Inscrições encerradas! Vamos começar a partida...");
          iniciarPartida(jogadores);
        }
      }, 1000);
    } else if (!partidaIniciada) {
      const novoEmbed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Vamos iniciar:")
        .setDescription(
          `⏰ Tempo para a próxima partida:\n**Esperando outros jogadores**\n\n👥 Jogadores:\n${listaJogadores}\n\nAdicione a reação 🎮 para jogar`
        );
      gameMessage.edit({ embeds: [novoEmbed] });
    }
  });

  // 🔴 Função para parar/abortar a partida
  async function parar() {
    if (interval) clearInterval(interval);
    collector.stop();

    // tenta excluir a mensagem inicial, mas ignora se já não existe
    if (gameMessage && gameMessage.deletable) {
      try {
        await gameMessage.delete();
      } catch (err) {
        console.error("Mensagem já não existe:", err);
      }
    }

    await message.channel.send("🛑 | Partida cancelada. use !iniciar para começar outra!");
  }

  return {
    collector,
    getPartidaIniciada: () => partidaIniciada,
    parar,
    gameMessage // 🔴 referência para validação no index.js
  };
}