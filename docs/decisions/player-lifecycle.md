# Player lifecycle

## Objetivo

Evitar players fantasmas e manter a UI responsiva sem afirmar que uma faixa está confirmada antes de o Lavalink responder.

## Decisões

- `currentTrack` representa a faixa confirmada.
- `pendingTrack` representa a faixa já enviada ao engine, mas ainda sem `start`.
- `trackLoading` é emitido imediatamente para o painel mostrar “Carregando…”.
- `play()` só define `currentTrack` depois que `playTrack` é aceito.
- `start` promove a faixa e limpa o estado pendente.
- `end` ignora eventos de faixa antiga quando existe transição pendente ou quando o identificador não é o atual.
- `loadFailed` entra no fluxo de recuperação, igual a `exception`/`stuck`.
- Timeout de `start` (10 s) evita player preso.
- Histórico limitado a 50 faixas por padrão.

## Voz

- Movimento de canal mantém o player e atualiza `voiceChannelId`.
- Desconexão, kick ou canal apagado destroem o player.
- `closed` do Lavalink é reconciliado após 1,5 s.
- Watchdog limpa players com conexão inconsistente e node caído há mais de 60 s.

## Volume

- O volume é persistido em memória por guild.
- Reiniciar o processo reseta o volume; persistência em disco ainda não foi decidida.

## Busca

- `/p` não usa autocomplete e resolve via Lavalink.
- `/yt` usa autocomplete do youtubei e respeita o tipo no texto livre.
- Busca de playlist por texto usa o youtubei; busca de vídeo usa `ytsearch:` do Lavalink.
- Um único client Innertube é compartilhado e pode degradar sem impedir o `/p`.
