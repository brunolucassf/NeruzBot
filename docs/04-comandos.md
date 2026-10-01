# 4. Comandos do Neruz Bot

## Como chamar um comando

Todo comando tem **duas formas de chamar**, e as duas fazem exatamente a mesma coisa:

| Forma | Exemplo | Observação |
|---|---|---|
| Prefixo **`n!`** | `n!tocar henrique e juliano` | Digitado no chat |
| Prefixo **`n.`** | `n.tocar henrique e juliano` | Idêntico ao `n!` |
| Comando de barra | `/tocar` ou `/play` | O Discord mostra o nome em português ou inglês, conforme o idioma de quem usa |

- Cada comando tem nome em **inglês e em português**: `n!pause` = `n!pausar`.
- Maiúsculas e minúsculas não importam (`N!PAUSAR` funciona).
- Sem espaço entre o prefixo e o comando: `n!pausar`, nunca `n! pausar`.
- Depois do comando vêm os argumentos: `n!tocar nome da música`, `n!pularpara 3`.
- Se o comando for digitado errado, o bot explica o uso correto. Só o `n!` responde a comandos desconhecidos (o `n.` é ignorado em silêncio, porque aparece em frases normais).
- Comandos de **controle** exigem estar no mesmo canal de voz que o bot. Para **tocar**, basta estar em um canal de voz.
- Há uma pausa de cerca de 1 segundo entre comandos da mesma pessoa, para evitar abuso.

## ▶️ Tocar

| Comando | Também funciona | O que faz |
|---|---|---|
| `n!tocar <nome ou link>` | `n!play` | Toca uma música ou playlist. Se já houver algo tocando, entra no **fim da fila** |
| `n!tocarja <nome ou link>` | `n!playnext` | Igual ao tocar, mas coloca **no início da fila** (toca logo depois da atual) |
| `n!playlist <link>` | `n!lista` | Toca uma **playlist inteira** (YouTube, Spotify) ou álbum |
| `n!arquivo` + anexo | `n!playfile` | Toca um arquivo de áudio que você anexou na mensagem |
| `n!buscar <texto>` | `n!search` | Mostra 10 resultados do YouTube em um menu para você escolher |

O que pode ser colado em `n!tocar` / `n!playlist`:

| Entrada | Resultado |
|---|---|
| Nome da música | Primeiro resultado do YouTube |
| Link de vídeo do YouTube / YouTube Music / shorts / live | O vídeo |
| Link de playlist do YouTube | A playlist inteira (até 200 músicas) |
| Link de vídeo dentro de uma playlist (`...&list=PL...`) | A playlist inteira |
| Mix automático do YouTube (`...&list=RD...`) | Só o vídeo (mixes são infinitos) |
| Link do Spotify (música, álbum, playlist, artista) | Cada música é tocada pela versão do YouTube. Playlists: até 100 músicas. Artista: 10 mais tocadas |
| SoundCloud, Bandcamp, Vimeo, Twitch, Dailymotion, Mixcloud, Audiomack, TikTok | Suportados |
| Link direto de áudio (`.mp3`, `.ogg`, `.wav`, `.flac`...) | Tocado direto |

No `n!playlist`, o bot avisa quantas músicas entraram e o tempo total.

## 🎛️ Controle

| Comando | Também funciona | O que faz |
|---|---|---|
| `n!pausar` | `n!pause` | **Pausa. Se já estiver pausada, continua** (alterna) |
| `n!continuar` | `n!resume`, `n!retomar` | Continua a música pausada |
| `n!pular` | `n!skip`, `n!next`, `n!proxima`, `n!trocar` | Pula para a próxima música da fila |
| `n!pularpara <posição>` | `n!skipto` | Pula direto para a música daquela posição da fila |
| `n!voltar` | `n!previous`, `n!back`, `n!anterior` | Volta para a música anterior (a atual vira a próxima) |
| `n!ir <tempo>` | `n!seek` | Vai para um ponto da música: `n!ir 1:30`, `n!ir 90`, `n!ir 2m15s` |
| `n!avancar [segundos]` | `n!forward`, `n!avançar` | Avança 10 segundos (ou o que você informar: `n!avancar 30`) |
| `n!retroceder [segundos]` | `n!rewind` | Volta 10 segundos (ou o que você informar) |
| `n!parar` | `n!stop` | Para a música e **limpa a fila**. O bot continua no canal por alguns minutos |
| `n!sair` | `n!leave`, `n!disconnect` | O bot sai do canal de voz na hora |
| `n!volume [0 a 200]` | `n!vol` | Sem número: mostra o volume. Com número: ajusta na hora |
| `n!repetir [modo]` | `n!loop` | Modos: `off`, `musica` (repete a atual), `fila` (repete tudo). Sem modo: alterna entre eles |

`/seek` e `n!avancar` não funcionam em transmissões ao vivo.

## 📜 Fila

A fila é por servidor: cada `n!tocar` adiciona ao fim (limite padrão: 500 músicas). Uma playlist só coloca várias músicas de uma vez na mesma fila.

| Comando | Também funciona | O que faz |
|---|---|---|
| `n!fila [página]` | `n!queue` | Mostra a fila (10 por página, com botões ◀️ ▶️), o tempo total e quem pediu cada música |
| `n!tocando` | `n!nowplaying`, `n!np`, `n!agora` | Música atual com barra de progresso e botões |
| `n!embaralhar` | `n!shuffle` | Embaralha as próximas músicas |
| `n!remover <posição>` | `n!remove` | Remove a música daquela posição |
| `n!mover <de> <para>` | `n!move` | Muda uma música de posição: `n!mover 5 1` |
| `n!limpar` | `n!clear` | Remove todas as próximas músicas (a atual continua tocando) |

A fila **não é salva** se o bot reiniciar.

## ℹ️ Geral

| Comando | Também funciona | O que faz |
|---|---|---|
| `n!ajuda` | `n!help`, `n!comandos` | Lista todos os comandos |

## Painel "Tocando agora"

A cada música, o bot publica no canal um cartão com capa, duração, quem pediu e a fonte, e apaga o da música anterior. Botões: ⏸️ pausar/retomar, ⏭️ pular, ⏹️ parar, 🔁 loop e 📜 fila. Seguem as mesmas regras dos comandos (estar no canal de voz do bot).

## Comportamentos automáticos

| Situação | O que o bot faz |
|---|---|
| Todos saíram do canal | Pausa. Se ninguém voltar em 60 s, sai |
| Alguém voltou ao canal | Retoma de onde parou |
| Fila acabou / `n!parar` | Avisa e sai após 3 min sem novas músicas |
| Música indisponível | Avisa o motivo (privado, removido, restrição de idade...) e pula |
| 3 falhas seguidas | Para e avisa (normalmente é bloqueio do YouTube) |
| Conexão caiu no meio da música | Retoma do mesmo ponto |
| Bot movido de canal por um moderador | Continua tocando no novo canal |
| Bot desconectado por um moderador | Limpa a fila e encerra |
| Canal de palco (Stage) | Tenta virar orador; sem permissão, pede para falar |

## Requisito para os comandos com prefixo

Para ler `n!comando`, o bot precisa da intent **Message Content**, ligada em Developer Portal → Bot → Privileged Gateway Intents. Sem ela, só os comandos de barra (`/`) funcionam.
