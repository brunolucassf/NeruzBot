# 🎵 Neruz Bot

Bot de música para Discord. Você entra em um canal de voz, digita `n!tocar` com o nome ou link da música e ele toca, com fila, playlists e controles por botões, em português e inglês.

> 🔒 **Versão de visualização.** Este repositório mostra a estrutura, os comandos e a qualidade do código do projeto. **Não é open source:** o núcleo (player, extração de áudio, integrações, segurança e deploy) é privado. Veja a [licença](LICENSE).

## O que o Neruz faz

- Toca músicas e **playlists completas** a partir de links ou busca por nome
- Aceita YouTube, Spotify, SoundCloud e outros, além de **arquivos de áudio**
- **Fila por servidor:** ver, remover, mover, embaralhar, pular, voltar, loop e volume
- Painel **"Tocando agora"** com botões e emojis próprios
- **22 comandos**, digitados (`n!tocar`, `n.tocar`) ou de barra (`/tocar`), cada um em **português e inglês**
- Recupera-se sozinho de quedas de conexão e economiza recursos quando o canal esvazia
- Voz com criptografia de ponta a ponta (**DAVE**), padrão atual do Discord

Lista completa de comandos: [docs/04-comandos.md](docs/04-comandos.md).

## Exemplo

```
n!tocar henrique e juliano liberdade provisória
n!playlist https://open.spotify.com/playlist/...
n!fila
n!pular
n!pausar
```

## Arquitetura (visão geral)

```mermaid
flowchart LR
    U[Usuário] -->|n!tocar ou /tocar| D[Discord]
    D --> E[Eventos]
    E --> A[Adaptador de comandos<br/>prefixo ⇄ barra]
    A --> C[Comandos]
    C --> P[Player por servidor]
    P --> Q[Fila]
    P -->|áudio Opus| V[Canal de voz]
```

- **Um núcleo, dois estilos de comando:** um adaptador faz mensagens como `n!tocar` se comportarem como comandos de barra, então a mesma implementação atende os dois.
- **Um player por servidor**, com operações serializadas para evitar conflitos.
- **Camadas separadas:** comandos, domínio (fila), apresentação (embeds e botões) e integrações.
- **Fila pura e testável:** sem dependência do Discord.

## Tecnologias

TypeScript (modo estrito) · Node.js 24 · discord.js 14 · @discordjs/voice · FFmpeg · zod · pino · vitest · Docker

## Estrutura

```
src/
├── commands/     Comandos de barra (tocar, controles, fila, ajuda)
├── prefix/       Comandos digitados (n!, n.) e adaptador
├── events/       Eventos do Discord (interações, mensagens, voz)
├── music/        Fila, faixas e gerenciador de players
├── ui/           Embeds e botões
├── utils/        Formatação, detecção de links, validações de voz
└── core/         Erros, tipos e logger
tests/            Testes automatizados da fila, formatação, links e comandos
```

> 🔒 Módulos privados, não incluídos aqui: reprodução e conexão de voz por servidor, resolução de faixas, extração e streaming de áudio, integração com Spotify, correspondência de músicas, proteções de segurança, scripts e infraestrutura de deploy. Por isso este repositório não compila sozinho.

## Qualidade

- TypeScript estrito, validação de configuração com zod e logs estruturados
- 100 testes automatizados no projeto completo (os testes das partes públicas estão em `tests/`)
- Dependências auditadas, sem vulnerabilidades conhecidas
- Roda 24 h em VPS, em container sem privilégios, sem portas abertas

## Autor

**Bruno Lucas** · projeto da família Neruz, em desenvolvimento ativo.
