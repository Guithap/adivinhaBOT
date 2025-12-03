import fs from "fs";
import { EmbedBuilder, ChannelType } from "discord.js";
import rodadas from "./rodadas.js";

// Lê o arquivo objetos.json
const conteudo = fs.readFileSync("./comandos/objetos.json", "utf-8");
const palavras = conteudo.split(",").map(p => p.trim()).filter(Boolean);

// Sorteia palavra aleatória
function palavraAleatoria() {
  const idx = Math.floor(Math.random() * palavras.length);
  return palavras[idx];
}

// 🔴 Mapa global de partidas por servidor
const partidas = new Map();

export default async function partidaCommand(message, client, finalizarPartida, jogadores) {
  const canal = message.channel;
  const guildId = message.guild.id;

  // Estado isolado para este servidor
  const estado = {
    jogadores,
    rodadasPorJogador: new Map(jogadores.map(j => [j.id, null])),
    palavrasPorJogador: new Map(jogadores.map(j => [j.id, palavraAleatoria()])),
    threadsCriados: [],
    rodadaAtual: 1
  };

  partidas.set(guildId, estado);

  const threadsInfo = [];

  // Cria tópicos privados para cada jogador
  for (let index = 0; index < jogadores.length; index++) {
    const jogador = jogadores[index];
    const proximo = index === jogadores.length - 1 ? jogadores[0] : jogadores[index + 1];
    const palavraDoProximo = estado.palavrasPorJogador.get(proximo.id);

    const embedPrivado = new EmbedBuilder()
      .setColor(0xffff00)
      .setTitle("📜 | Informações da rodada")
      .setDescription(
        `📣 | O próximo jogador (${proximo}) terá que responder a palavra: **${palavraDoProximo}**`
      );

    try {
      const thread = await canal.threads.create({
        name: `Rodada-${jogador.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread
      });

      await thread.members.add(jogador.id);
      await thread.send({ content: `${jogador}`, embeds: [embedPrivado] });

      estado.threadsCriados.push(thread);
      threadsInfo.push(`**• Chat do ${jogador}**: ${thread.toString()}`);
    } catch (err) {
      console.error("Erro ao criar tópico privado:", err);
      threadsInfo.push(`**• Chat do ${jogador}**: (erro ao criar tópico)`);
    }
  }

  // Embed inicial
  let tempo = 10;
  const embedPublico = new EmbedBuilder()
    .setColor(0xffff00)
    .setTitle("📜 | Veja as informações necessárias para o jogo:")
    .setDescription(`${threadsInfo.join("\n")}\n\n⛳ | Tempo para o jogo começar: **${tempo} segundos**`);

  const msgEmbed = await canal.send({ embeds: [embedPublico] });

  const interval = setInterval(async () => {
    tempo--;

    if (tempo > 0) {
      const novoEmbed = EmbedBuilder.from(embedPublico)
        .setDescription(`${threadsInfo.join("\n")}\n\n⛳ | Tempo para o jogo começar: **${tempo} segundos**`);
      await msgEmbed.edit({ embeds: [novoEmbed] });
    } else {
      clearInterval(interval);
      const finalEmbed = EmbedBuilder.from(embedPublico)
        .setDescription(`${threadsInfo.join("\n")}\n\n🚀 Jogo começou!`);
      await msgEmbed.edit({ embeds: [finalEmbed] });

      // inicia rodadas
      rodadas(canal, jogadores, estado.rodadaAtual, estado.rodadasPorJogador, encerrarPartida, estado.palavrasPorJogador);
    }
  }, 1000);

  // Função de encerrar partida
  async function encerrarPartida(rodadasNecessarias = null) {
    finalizarPartida();

    // exclui threads privadas
    for (const thread of estado.threadsCriados) {
      try {
        // remove todos os membros do tópico
        for (const jogador of estado.jogadores) {
          try {
            await thread.members.remove(jogador.id);
          } catch (err) {
            console.warn(`Não consegui remover ${jogador.username} do thread ${thread.name}:`, err);
          }
        }

        // se estiver arquivado, desarquiva antes
        if (thread.archived) await thread.setArchived(false);

        // exclui o tópico
        if (thread.deletable) {
          await thread.delete();
        } else {
          console.warn(`Thread ${thread.name} não pode ser deletado (permissão ou tipo).`);
        }
      } catch (err) {
        console.error(`Erro ao excluir thread ${thread.name}:`, err);
      }
    }

    // limpa mensagens do canal
    try {
      const fetched = await canal.messages.fetch({ limit: 100 });
      await canal.bulkDelete(fetched, true);
    } catch (err) {
      console.error("Erro ao apagar mensagens do canal:", err);
    }

    // Ranking ordenado pelo menor número de rodadas
    const rankingOrdenado = [...estado.rodadasPorJogador.entries()]
      .map(([id, rodadas]) => ({
        jogador: estado.jogadores.find(j => j.id === id),
        rodadas: rodadas ?? Infinity, // quem não acertou fica no fim
        palavra: estado.palavrasPorJogador.get(id)
      }))
      .sort((a, b) => a.rodadas - b.rodadas);

    let posicao = 1;
    let ultimoValor = null;
    const linhas = rankingOrdenado.map((item, i) => {
      if (ultimoValor === null || item.rodadas !== ultimoValor) {
        posicao = i + 1;
        ultimoValor = item.rodadas;
      }
      const medalha = posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : `#${posicao}`;
      if (item.rodadas === Infinity) {
        return `${medalha} ${item.jogador} não acertou "${item.palavra}"`;
      }
      return `${medalha} ${item.jogador} acertou em ${item.rodadas} rodadas "${item.palavra}"`;
    });

    const embedFim = new EmbedBuilder()
      .setColor(0xffffff) // branco
      .setTitle("🏁 | Partida acabou! Use !iniciar para começar outra.")
      .setDescription(
        `${linhas.join("\n")}` +
        (rodadasNecessarias ? `\n\n📊 | O jogo precisou de **${rodadasNecessarias} rodadas** para terminar.` : "")
      );

    await canal.send({ embeds: [embedFim] });

    // remove estado desse servidor
    partidas.delete(guildId);

    // excluir canal principal se possível
    try {
      if (canal.deletable) {
        await canal.delete();
      } else {
        console.warn(`Canal ${canal.name} não pode ser deletado (permissão ou tipo).`);
      }
    } catch (err) {
      console.error("Erro ao excluir canal principal:", err);
    }
  }

  return { encerrarPartida };
}