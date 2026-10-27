# Lúcio

Bot de música para Discord em Node.js, usando Lavalink + Shoukaku para reprodução e `youtubei.js` para autocomplete, playlists e recomendações.

## Stack

- Node.js 22+ (ESM)
- discord.js 14
- Shoukaku + Lavalink 4 com plugin do YouTube
- `youtubei.js` para busca/autocomplete/playlists
- pino para logs
- Docker Compose para bot, Lavalink e yt-cipher

## Estrutura

```
Lucio/
  src/
    app/          bootstrap, config, eventos
    discord/      comandos, interações, mensagens, permissões
    music/        player, playback, search, recommendation, settings
    voice/        ciclo de vida e idle da voz
    utils/
  test/           testes com node:test
application.yml   configuração do Lavalink
compose.yml       stack de produção
compose.dev.yml   override de desenvolvimento
```

## Configuração

Crie o `.env` a partir do `.env.example`:

```env
DISCORD_TOKEN=
CLIENT_ID=

LAVALINK_PASSWORD=
YOUTUBE_OAUTH_REFRESH_TOKEN=

# Donos do bot. Aceita 123,456 ou [123,456].
OWNERS_ID=

# Token compartilhado entre Lavalink e yt-cipher.
YT_CIPHER_TOKEN=
```

`OWNERS_ID` é uma allowlist de aplicação: libera comandos de dono, como `/sync` e o bypass do `/stop` fora do canal do bot. Não altera permissões do Discord.

## Rodando

### Docker

```bash
docker compose -f compose.yml -f compose.dev.yml up -d --build
```

O `compose.yml` sobe:

- `lucio`: bot;
- `lavalink`: servidor de áudio;
- `yt-cipher`: serviço local de decipher do YouTube.

### Local

```bash
cd Lucio
npm install
npm start
```

## Comandos

| Comando | O que faz |
|---|---|
| `/p query` | Toca por nome/URL, sem autocomplete |
| `/yt tipo busca` | Busca específica de vídeo ou playlist, com autocomplete |
| `/queue` | Mostra a fila |
| `/pause` / `/resume` | Pausa/retoma |
| `/skip [qtd]` | Pula faixas |
| `/previous` | Volta no histórico (limitado) |
| `/shuffle` | Embaralha a fila |
| `/repeat` | Off, faixa ou fila |
| `/autoplay` | Liga/desliga recomendações |
| `/stop` | Encerra e desconecta |
| `/sync` | Dono: ressincroniza slash commands |

O painel do player é simplificado de propósito: sem botões de previous/autoplay e vinculado ao primeiro canal de texto onde o player foi criado.

## Testes

```bash
cd Lucio
npm test
```

O comando configura as variáveis de ambiente de teste e roda `node --test`.

## Comportamento de voz

- Movimento de canal mantém o player e atualiza a posição.
- Desconexão, kick ou canal apagado destroem o player.
- Um `closed` do Lavalink é reconciliado depois de um grace period.
- O watchdog limpa players sem conexão saudável e players com node caído há mais de 60 s.
- O shutdown (`SIGTERM`/`SIGINT`) tenta destruir os players antes de encerrar.

## Limitações conhecidas

- Volume é persistido em memória por guild; reiniciar o processo reseta.
- O histórico mantém 50 faixas por padrão.
- Não há persistência de fila.
- `/sync` registra comandos globais; a propagação do Discord pode levar alguns minutos.
- O painel permanece no canal de texto onde o player foi criado.
