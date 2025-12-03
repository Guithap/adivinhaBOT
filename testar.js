import { EmbedBuilder } from "discord.js";

const MEU_ID = "1308241288193114152";       // coloque aqui seu ID
const SERVIDOR_ID = "1388552323558539416"; // coloque aqui o ID do servidor

export default async function testarCommand(message, client, iniciarPartida) {
  // só funciona se for você e no servidor certo
  if (message.author.id !== MEU_ID || message.guild.id !== SERVIDOR_ID) {
    return message.reply("🚫 | Você não tem permissão para usar este comando.");
  }

  // cria embed de início imediato
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎮 | Teste de Partida")
    .setDescription(
      `✅ | Partida iniciada imediatamente para ${message.author.toString()}`
    );

  await message.channel.send({ embeds: [embed] });

  // inicia a partida só com você
  iniciarPartida([message.author]);
}