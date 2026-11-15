# Segurança

## Relatar uma vulnerabilidade

Se encontrar um problema de segurança, **não** abra uma issue pública.

Envie um relatório privado via [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-managing-security-vulnerabilities/privately-reporting-a-security-vulnerability)
do repositório (Security → Advisories → New draft advisory), ou contate os mantenedores pelo canal do perfil do repositório.

Inclua:

- descrição do impacto;
- passos para reproduzir;
- navegador, versão ou commit afetado;
- um exemplo mínimo de cena ou resposta de IA que reproduza o problema, se houver.

## O que o threeLab executa

O fluxo **Novo modelo com IA** compila e executa, na própria página, o código JavaScript que você cola.
Isso é intencional: uma cena é código. Por isso:

- **Não é vulnerabilidade** o fato de um código colado poder executar JavaScript. Cole apenas respostas de IA que você mesmo pediu.
- **É vulnerabilidade** qualquer caminho em que código rode **sem o usuário colá-lo**: por exemplo via URL (`?scene=`), título ou descrição de cena renderizados como HTML, ou conteúdo de **Minhas criações** de outra origem.
- **É vulnerabilidade** burlar as proteções do compilador (`src/user-scene.js`), como imports não permitidos que passem pela validação.

O app não faz requisições a servidores próprios nem a terceiros. As fontes são servidas localmente. As criações ficam no
`localStorage` do navegador.

## Boas práticas para quem usa o projeto

- Não cole código de origem desconhecida. Leia o que a IA devolveu antes de carregar.
- Ao hospedar o threeLab em um domínio compartilhado, use um domínio próprio: o `localStorage` e o código colado ficam na mesma origem de qualquer outra página desse domínio.
- Mantenha as dependências atualizadas (`npm audit`).
