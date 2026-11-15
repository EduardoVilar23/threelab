# Contribuindo

Obrigado por contribuir com o threeLab.

Antes de abrir um PR grande, leia o [ROADMAP.md](ROADMAP.md) e abra uma issue para alinhar o escopo.
Ao participar, você concorda com o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Formas de contribuir (da mais simples à mais profunda)

| Tipo | Exemplos | Como |
|------|----------|------|
| **Docs** | README, typos, exemplos | PR direto e pequeno |
| **Cenas de exemplo** | Um modelo novo em `scenes/` | PR com a cena, após `npm run check` |
| **Bugs** | Erro ao compilar uma resposta de IA, malha aberta, exportação errada | Issue com passos e, se puder, a cena ou o código colado |
| **Prompt** | Melhorar `src/prompt/reference.md` para a IA errar menos | Issue ou PR com exemplo antes/depois |
| **Features** | Novo formato, novo controle no visualizador | Issue primeiro, depois discussão e PR |

## Como começar

1. Faça fork e clone.
2. Instale e rode (Node 18 ou superior):

   ```bash
   npm install
   npm run dev          # http://localhost:5199
   ```

3. Crie um branch: `git checkout -b fix/descricao-curta` ou `feat/descricao-curta`.

## Adicionando uma cena de exemplo

```bash
npm run new caneca "Caneca"     # cria scenes/caneca.js
npm run check caneca            # dimensões, volume, massa, peças fechadas?
```

- Nome do arquivo em kebab-case. Arquivos que começam com `_` são helpers e não aparecem na lista.
- Unidade: 1 unidade = 1 mm, eixo Y para cima, chão em y = 0.
- Exponha em `params` o que o usuário vai querer ajustar (dimensões, cores, texto).
- Dê `name` às peças. Cada peça com uma cor vira um objeto no `.3mf`.
- Confira `Fechado` no `npm run check` antes de abrir o PR. Cenas para impressão precisam ser malhas fechadas.
- Use apenas imagens e logos que você tem direito de publicar. Não inclua marcas de terceiros em `assets/`.
- Cenas pessoais ou de clientes que ficam só na sua máquina: adicione o arquivo ao `.gitignore` (veja o bloco "Meus modelos").

A convenção completa e a biblioteca estão em [CLAUDE.md](CLAUDE.md) e em `src/lib/index.js`.

## Mudando a biblioteca

Ao adicionar ou alterar uma função em `src/lib/`, atualize também `src/prompt/reference.md`.
Esse arquivo é o que a IA recebe no prompt. Se ele ficar desatualizado, o código gerado deixa de funcionar.

## Boas práticas

- Mudanças pequenas e focadas, um problema por PR.
- Não faça commit de `node_modules/`, `exports/` ou `dist/`.
- Mantenha a interface sem emojis e com texto direto e em português: verbos no imperativo, medida no lugar de adjetivo.
- Respeite a identidade em [`brand/`](brand/README.md) ao mexer em cores, fontes ou no símbolo.
- No PR: o porquê, como testar e a referência à issue, se existir.
- Atualize o [CHANGELOG.md](CHANGELOG.md) em `[Unreleased]` quando a mudança for relevante para quem usa o app.

## Testes

Ainda não há suíte automatizada (veja o [ROADMAP.md](ROADMAP.md)). Antes de abrir o PR:

```bash
npm run check <cena>             # para cada cena que você alterou
npx vite build --outDir /tmp/threelab-check   # o build de produção precisa passar
```

E teste no navegador: abra o modelo, mexa nos parâmetros, exporte e, se mexeu no fluxo de IA, cole uma resposta válida e uma com erro.

## Segurança

Não abra issue pública para vulnerabilidades. Siga o [SECURITY.md](SECURITY.md).

## Idioma

Issues e PRs em **português** ou **inglês**.

## Licença

Ao contribuir, você concorda que sua contribuição será licenciada sob a [MIT](LICENSE).
