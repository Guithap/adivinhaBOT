import "dotenv/config"; // garante que o .env seja carregado aqui também

export default {
  token: process.env.TOKEN,
  client: process.env.CLIENT_ID,
  prefix: "!",
  botName: "AdivinheBot",
  gameSettings: {
    maxTentativas: 10,
    maxPulos: 2,
    maxDicas: 5,
    dicasPorRodada: 1
  }
};