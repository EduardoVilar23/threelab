# Changelog

Todas as mudanças notáveis deste projeto serão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e o versionamento pretende seguir [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- Cena de exemplo `threelab-logo`: o símbolo da marca feito com o próprio threeLab (duas peças, 3MF)
- Fluxo **Novo modelo com IA**: descrever, copiar o prompt, colar a resposta e carregar o modelo
- Prompts de criação, ajuste e correção de erro (`src/prompt/`), com a referência da biblioteca para a IA
- Compilação de cenas coladas no navegador (`src/user-scene.js`) com mensagens de erro em português
- **Minhas criações**: cenas coladas ficam salvas no navegador
- **Ajustar com IA**, inclusive nos exemplos
- Identidade visual: paleta Gesso, Grafite e Resina, Archivo e JetBrains Mono (locais), símbolo e favicon
- Pasta `brand/` com badges, header do README e guia da identidade visual
- PNG exportado com o selo "made with threeLab" no canto inferior direito, opcional pelo seletor **Com selo / Sem selo**
- Selo "código aberto · github" no fim da barra lateral, com link para o repositório
- Badges da marca em `brand/badges/` e no topo do README, com seção "Feito com threeLab"
- Documentação de comunidade: `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md` e template de PR

### Changed

- Interface reorganizada: barra de ferramentas no rodapé do palco, rótulos em caixa de frase, ícones de linha no lugar de emojis
- Contraste do acento corrigido; espaçamentos na grade de 4px
- Grade de milímetros e caixa de medidas usam as cores da marca
- README reescrito para refletir a interface

## [0.1.0]

### Added

- Biblioteca de modelagem sobre three.js e manifold-3d
- Visualizador web com parâmetros, corte, medidas e exportação (GLB, glTF, USDZ, STL, 3MF, OBJ, PLY)
- CLI: `list`, `new`, `check`, `walls`, `export`
