import { EmbedBuilder } from "discord.js";

export default async function rodadas(
  canal,
  jogadores,
  rodadaAtual,
  rodadasPorJogador,
  encerrarPartida,
  palavrasPorJogador
) {
  let index = 0;
  const acertos = new Set();
  let chutesNaRodada = 0;
  let pulosNaRodada = 0;

  async function proximaInteracao() {
    if (acertos.size === jogadores.length) return encerrarPartida(rodadaAtual);
    if (rodadaAtual > 10) return encerrarPartida(rodadaAtual);

    const perguntador = jogadores[index];
    const respondedor = index === jogadores.length - 1 ? jogadores[0] : jogadores[index + 1];

    // 🔹 Mensagem da dica
    let embedDica = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`🎯 | Rodada ${rodadaAtual}`)
      .setDescription(`📢 ${perguntador} dê uma dica para ${respondedor}`);

    const msgDica = await canal.send({ embeds: [embedDica] });

    let tempoDica = 30;
    const intervaloDica = setInterval(async () => {
      if (tempoDica > 1) {
        tempoDica--;
        await msgDica.edit({
          embeds: [embedDica.setDescription(`📢 ${perguntador} dê uma dica para ${respondedor}\n⏰ Restam **${tempoDica} segundos**`)]
        });
      } else if (tempoDica === 1) {
        tempoDica--;
        await msgDica.edit({
          embeds: [embedDica.setDescription(`📢 ${perguntador} dê uma dica para ${respondedor}\n⏰ **1 segundo restante**`)]
        });
        setTimeout(async () => {
          clearInterval(intervaloDica);
          await msgDica.edit({
            embeds: [embedDica.setDescription(`📢 ${perguntador} não deu dica.\n⏰ Tempo esgotado! Vez pulada.`)]
          });
          pulosNaRodada++;
          if (pulosNaRodada === jogadores.length) {
            await canal.send("❌ | Todos os jogadores ficaram sem responder. Partida cancelada!");
            return encerrarPartida(rodadaAtual);
          }
          index = (index + 1) % jogadores.length;
          proximaInteracao();
        }, 1000);
      }
    }, 1000);

    const dicaCollector = canal.createMessageCollector({
      filter: msg => msg.author.id === perguntador.id,
      max: 1,
      time: 31000
    });

    dicaCollector.on("collect", async () => {
      clearInterval(intervaloDica);
      await msgDica.edit({
        embeds: [embedDica.setDescription(`📢 ${perguntador} deu a dica!\n✅ Mensagem respondida`)]
      });
      await canal.send(`💡 ${perguntador} enviou a dica para ${respondedor}!`);

      // 🔹 Mensagem do chute
      let embedChute = new EmbedBuilder()
        .setColor(0x00ffff)
        .setTitle(`🎯 | Rodada ${rodadaAtual}`)
        .setDescription(`🎳 ${respondedor} chute a sua palavra!`);

      const msgChute = await canal.send({ embeds: [embedChute] });

      let tempoChute = 30;
      const intervaloChute = setInterval(async () => {
        if (tempoChute > 1) {
          tempoChute--;
          await msgChute.edit({
            embeds: [embedChute.setDescription(`🎳 ${respondedor} chute a sua palavra!\n⏰ Restam **${tempoChute} segundos**`)]
          });
        } else if (tempoChute === 1) {
          tempoChute--;
          await msgChute.edit({
            embeds: [embedChute.setDescription(`🎳 ${respondedor} chute a sua palavra!\n⏰ **1 segundo restante**`)]
          });
          setTimeout(async () => {
            clearInterval(intervaloChute);
            await msgChute.edit({
              embeds: [embedChute.setDescription(`🎳 ${respondedor} não respondeu.\n⏰ Tempo esgotado! Vez pulada.`)]
            });
            pulosNaRodada++;
            if (pulosNaRodada === jogadores.length) {
              await canal.send("❌ | Todos os jogadores ficaram sem responder. Partida cancelada!");
              return encerrarPartida(rodadaAtual);
            }
            index = (index + 1) % jogadores.length;
            proximaInteracao();
          }, 1000);
        }
      }, 1000);

      const chuteCollector = canal.createMessageCollector({
        filter: msg => msg.author.id === respondedor.id,
        max: 1,
        time: 31000
      });

      chuteCollector.on("collect", async msg => {
        clearInterval(intervaloChute);
        const tentativa = msg.content.trim();
        const palavraCorreta = palavrasPorJogador.get(respondedor.id);

        if (tentativa.toLowerCase() === palavraCorreta.toLowerCase()) {
          await msgChute.edit({
            embeds: [embedChute.setColor(0x2ecc71).setDescription(`✅ ${respondedor} acertou!\n✅ Mensagem respondida`)]
          });
          await canal.send(`🎉 ${respondedor} acertou a palavra!`);
          if (!rodadasPorJogador.get(respondedor.id)) {
            rodadasPorJogador.set(respondedor.id, rodadaAtual);
          }
          acertos.add(respondedor.id);
        } else {
          await msgChute.edit({
            embeds: [embedChute.setColor(0xe74c3c).setDescription(`❌ ${respondedor} errou.\n✅ Mensagem respondida`)]
          });
          await canal.send(`😢 ${respondedor} errou o chute.`);
          // 🔴 Não revela a resposta aqui, só no final
        }

        chutesNaRodada++;
        if (chutesNaRodada === jogadores.length) {
          chutesNaRodada = 0;
          pulosNaRodada = 0;
          rodadaAtual++;
        }

        index = (index + 1) % jogadores.length;
        proximaInteracao();
      });
    });
  }

  proximaInteracao();
}