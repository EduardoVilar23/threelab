// threeLab — geração dos prompts para copiar/colar na IA e extração do código da resposta.
import reference from './reference.md?raw';

export const GOALS = {
  web: {
    label: 'Visualização / site (GLB)',
    text: 'O modelo é para visualização na web. Priorize boa aparência: cores, materiais e proporções.',
  },
  print: {
    label: 'Impressão 3D (várias cores)',
    text:
      'O modelo será impresso em 3D (FDM). Cada cor deve ser uma peça separada (`name` + `color`). ' +
      'Respeite espessura mínima de parede, folgas e evite balanços muito grandes.',
  },
  resin: {
    label: 'Impressão 3D em resina (uma cor)',
    text:
      'O modelo será impresso em resina, em uma cor só. Gere uma peça única (use `union`/`subtract` para ' +
      'juntar o corpo com relevos ou gravações), com detalhes em relevo de 0,8–1,2 mm. ' +
      'Se a peça for grande e maciça, oque-a com `hollow` deixando fundo aberto ou furos de drenagem.',
  },
};

const FORMAT_RULES = `## Formato da resposta

Responda **somente** com um único bloco de código \`\`\`js contendo o arquivo completo.
Sem explicações antes ou depois, sem trechos parciais, sem "// resto do código aqui".`;

const INTRO =
  'Você é um modelador 3D especialista em modelagem paramétrica por código. ' +
  'Escreva o código de uma cena para o app threeLab seguindo exatamente a referência abaixo.';

function join(...parts) {
  return parts.filter(Boolean).join('\n\n');
}

function block(title, content) {
  return `## ${title}\n\n${content.trim()}`;
}

function codeBlock(code) {
  return '```js\n' + code.trim() + '\n```';
}

/** Prompt para criar um modelo novo. */
export function buildCreatePrompt({ request, goal = 'web' }) {
  return join(
    INTRO,
    reference.trim(),
    block('Objetivo', GOALS[goal]?.text ?? GOALS.web.text),
    block('Pedido do usuário', request),
    FORMAT_RULES,
  );
}

/** Prompt para ajustar um modelo existente (mostra o código atual). */
export function buildRefinePrompt({ code, change, goal = 'web' }) {
  return join(
    INTRO,
    reference.trim(),
    block('Objetivo', GOALS[goal]?.text ?? GOALS.web.text),
    block('Código atual', codeBlock(code)),
    block('O que mudar', change),
    'Devolva o arquivo **completo** já com a alteração aplicada, mantendo o que não foi pedido para mudar.',
    FORMAT_RULES,
  );
}

/** Prompt para corrigir um erro que apareceu ao executar o código. */
export function buildFixPrompt({ code, error }) {
  return join(
    INTRO,
    reference.trim(),
    block('Código que falhou', codeBlock(code)),
    block('Erro ao executar', '```\n' + String(error).trim() + '\n```'),
    'Corrija o erro e devolva o arquivo **completo**.',
    FORMAT_RULES,
  );
}

/**
 * Extrai o código JS de uma resposta de IA: aceita bloco ```js ... ``` (escolhe o que tem
 * `export default`) ou o próprio código colado sem cercas.
 */
export function extractCode(text) {
  const raw = String(text ?? '').trim();
  const fences = [...raw.matchAll(/```[\w-]*[ \t]*\r?\n([\s\S]*?)```/g)].map((m) => m[1].trim());
  if (fences.length) {
    return fences.find((c) => /export\s+default/.test(c)) ?? fences.sort((a, b) => b.length - a.length)[0];
  }
  // fence aberto e sem fechamento (resposta cortada) ou texto cru
  return raw.replace(/^```[\w-]*[ \t]*\r?\n/, '').replace(/\n?```\s*$/, '').trim();
}
