# Roadmap

Plano público do threeLab. Issues e PRs podem antecipar ou alterar prioridades. Abra uma discussão se quiser influenciar a ordem.

## Princípios

1. **Tudo local** — o app roda no navegador e não envia nada a servidores. Nenhuma conta, nenhuma chave de API.
2. **Qualquer IA** — o fluxo é copiar o prompt, colar a resposta. O threeLab não depende de um provedor.
3. **Medida, não adjetivo** — o que o app mostra (dimensões, volume, malha fechada) deve ser verificável.

## Agora

- [x] Visualizador com parâmetros, cortes, medidas e exportação (GLB, glTF, USDZ, STL, 3MF, OBJ, PLY)
- [x] Fluxo **Novo modelo com IA**: descrever → copiar prompt → colar resposta
- [x] **Copiar erro para a IA corrigir** e **Ajustar com IA**
- [x] **Minhas criações** salvas no navegador
- [x] Identidade visual (Gesso, Grafite e Resina) e fontes locais
- [x] README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT e LICENSE
- [ ] Publicar o repositório no GitHub com About e Topics

## Próximo

- [ ] Testes automatizados do compilador de cenas (`src/user-scene.js`) e da extração de código (`src/prompt/`)
- [ ] CI: build de produção e `check` em todas as cenas de exemplo
- [ ] Exportar e importar **Minhas criações** como arquivos `.js`
- [ ] Arrastar e soltar um `.js` no visualizador
- [ ] Versão hospedada com domínio próprio

## Depois

- [ ] Executar o código colado em um iframe ou Worker isolado
- [ ] Suporte a logos e SVG no fluxo de IA (hoje só em cenas de `scenes/`)
- [ ] Interface em inglês
- [ ] Mais exemplos de cenas: caixas com tampa, suportes, placas de texto

## Fora de escopo (por agora)

- Chamar APIs de IA a partir do app (exigiria guardar chaves)
- Contas, login e armazenamento em nuvem
- Edição manual de malhas (o threeLab modela por código)
