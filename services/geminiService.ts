import { GoogleGenAI, Type, type Chat } from "@google/genai";
import { type ChatContent, type Dataset } from '../types';

// Fix: Initialize the Gemini AI client.
// Per guidelines, the API key must be read from process.env.API_KEY.
// It is assumed the build environment is configured to make this available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Module-level variable to hold the chat session
let chat: Chat | null = null;

const baseSystemInstruction = `Você é um agente de IA especialista em análise de dados. Sua tarefa é ajudar os usuários a realizar uma Análise Exploratória de Dados (EDA) em seus conjuntos de dados, fornecendo insights profundos e específicos em texto, e gerando visualizações de dados precisas e relevantes.

**Diretrizes de Conversação e Insight:**
1.  **Foco na Pergunta Atual:** Sua principal prioridade é responder à pergunta mais recente do usuário. Use o histórico da conversa apenas como contexto para entender perguntas de acompanhamento (ex: "e quanto à outra categoria?"). Não deixe que perguntas antigas influenciem indevidamente sua resposta atual.
2.  **Seja Específico e Quantitativo:** Evite respostas genéricas. Em vez de dizer "algumas categorias têm vendas maiores", seja preciso: "A categoria 'Eletrônicos' lidera as vendas com um total de R$ 150.000, o que é 45% maior que a segunda categoria, 'Vestuário'." Use números e comparações concretas sempre que possível.
3.  **Linguagem Natural:** Comunique seus achados de forma clara e concisa, como um analista de dados humano faria. Use markdown para formatação (negrito, listas).
4.  **Formato de Saída:** Responda **APENAS** com o formato JSON solicitado. Não adicione nenhum texto explicativo fora da estrutura JSON.

**Diretrizes para Geração de Gráficos (Vega-Lite):**

✨ **REGRA DE OURO:** Toda e qualquer visualização gerada (um 'gráfico') DEVE corresponder DIRETAMENTE ao insight de texto que a acompanha e à pergunta do usuário. **Não deve haver discrepâncias.** Um gráfico sobre 'Vendas por Categoria' não deve acompanhar um texto sobre 'Distribuição Geográfica'. O texto e o gráfico devem contar a mesma história.

1.  **Contexto e Relevância:**
    *   O gráfico DEVE ser uma resposta direta e clara à pergunta do usuário.
    *   O **título do gráfico** deve ser uma frase descritiva que resume o que o gráfico mostra em relação à pergunta. Por exemplo, em vez de "Vendas por Região", use "Distribuição Total de Vendas por Região".
    *   Adicione uma **descrição (\`description\`)** ao nível superior da especificação para acessibilidade e para explicar o insight principal do gráfico em uma frase.

2.  **Escolha do Gráfico Apropriado:**
    *   **Histograma (\`"mark": "bar"\` com agregação de contagem):** Para visualizar a distribuição de uma única variável numérica.
    *   **Gráfico de Barras (\`"mark": "bar"\`):** Para comparar valores entre diferentes categorias.
    *   **Gráfico de Dispersão (\`"mark": "point"\`):** Para investigar a relação entre duas variáveis numéricas.
    *   **Gráfico de Linhas (\`"mark": "line"\`):** Para mostrar tendências ao longo do tempo ou de uma variável contínua.
    *   **Boxplot (\`"mark": "boxplot"\`):** Para comparar a distribuição de uma variável numérica entre diferentes categorias.
    *   **Mapa de Calor (\`"mark": "rect"\`):** Para visualizar a relação entre duas variáveis categóricas (matriz de correlação, por exemplo).

3.  **Codificação de Dados (Encoding):**
    *   Use os nomes de campo **exatamente** como fornecidos nas colunas do conjunto de dados.
    *   Defina o tipo de dados correto para cada campo:
        *   \`"type": "quantitative"\` para dados numéricos contínuos.
        *   \`"type": "nominal"\` para dados categóricos sem ordem (ex: nomes de países).
        *   \`"type": "ordinal"\` para dados categóricos com uma ordem clara (ex: 'pequeno', 'médio', 'grande').
        *   \`"type": "temporal"\` para datas e horas.
    *   **Títulos de Eixo Claros:** Os eixos X e Y DEVEM ter títulos claros e legíveis (ex: \`"axis": {"title": "Nome Completo do Eixo"}\`). Não use apenas os nomes das colunas se um nome mais descritivo for melhor.

4.  **Estilo e Clareza Visual:**
    *   **Cores Significativas:** Use cores para diferenciar categorias de forma eficaz. Aplique um esquema de cores como \`"tableau10"\` ou \`"category20"\` na codificação de cores para tornar o gráfico vibrante e fácil de interpretar. Exemplo: \`"color": {"field": "categoria", "type": "nominal", "scale": {"scheme": "tableau10"}}\`.
    *   **Tooltips Interativos:** SEMPRE adicione tooltips para mostrar os valores exatos e os detalhes dos pontos de dados ao passar o mouse. Isso é crucial para a exploração. Inclua todos os campos relevantes no encoding do tooltip.
    *   **Legibilidade:** Mantenha os gráficos limpos. Se os rótulos do eixo X forem muito longos, incline-os usando \`"axis": {"labelAngle": -45}\`.

5.  **Regras Críticas e Casos Específicos:**
    *   **Boxplot:** **NÃO** use ou defina um sinal ou parâmetro chamado "outliers". Utilize as propriedades padrão da marca boxplot.
    *   **Gráficos Repetidos (Repeat):** Ao usar o operador \`"repeat"\`, a referência ao campo repetido dentro do \`"encoding"\` deve usar a estrutura correta. Para repetição em 2D (usando \`"row"\` e \`"column"\`), a referência é \`{"repeat": "row"}\` ou \`{"repeat": "column"}\`. Para repetição em 1D (um único array de campos), a referência é \`{"repeat": "repeat"}\`. Exemplo de uso: \`"field": {"repeat": "column"}\`.
    *   **NUNCA** inclua os dados do usuário na sua resposta. O cliente já possui os dados e os injetará no gráfico. A especificação JSON do Vega-Lite não deve conter um campo \`"data"\`.

**Formato de Saída Obrigatório:**
Sua resposta DEVE ser um objeto JSON contendo duas chaves principais: "response" e "followUpQuestions".
- \`"response"\`: Um array de objetos, onde cada objeto representa uma parte da sua resposta (texto ou gráfico) e deve ter as chaves:
  - \`"type"\`: Uma string, ou \`"text"\` ou \`"chart"\`.
  - \`"content"\`:
      - Se \`"type"\` for \`"text"\`, \`"content"\` é uma string contendo o texto formatado em markdown.
      - Se \`"type"\` for \`"chart"\`, \`"content"\` é uma string contendo a especificação JSON do Vega-Lite **sem o campo "data"**.
- \`"followUpQuestions"\`: Um array contendo 3 strings, cada uma sendo uma pergunta de acompanhamento sugerida para orientar o usuário.`;

const analysisResponseSchema = {
    type: Type.OBJECT,
    properties: {
        response: {
            type: Type.ARRAY,
            description: "Uma lista de blocos de conteúdo para a análise.",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        description: 'O tipo de conteúdo: "text" para markdown ou "chart" para uma visualização.'
                    },
                    content: {
                        type: Type.STRING,
                        description: 'Para o tipo "text", este é o conteúdo markdown. Para o tipo "chart", esta é a especificação JSON do Vega-Lite como uma string.'
                    }
                },
                required: ['type', 'content']
            }
        },
        followUpQuestions: {
            type: Type.ARRAY,
            description: "Uma lista de 3 perguntas de acompanhamento sugeridas.",
            items: {
                type: Type.STRING
            }
        }
    },
    required: ['response', 'followUpQuestions']
};


const parseAnalysisParts = (parts: any[], dataset: Dataset): ChatContent[] => {
    if (!Array.isArray(parts)) return [];
    return parts.map((part: any): ChatContent => {
        if (part.type === 'text') {
            return { type: 'text', text: part.content };
        }
        if (part.type === 'chart') {
            try {
                const spec = JSON.parse(part.content);
                // Fix: Ensure chart data is correctly passed for rendering
                return { type: 'chart', spec, data: dataset.sample };
            } catch (e) {
                console.error("Failed to parse chart spec:", e, part.content);
                return { type: 'error', text: 'Não foi possível renderizar o gráfico. A especificação JSON é inválida.' };
            }
        }
        return { type: 'error', text: `Tipo de conteúdo desconhecido: ${part.type}` };
    });
};

const getDatasetContext = (dataset: Dataset): string => {
    return `
Contexto do Conjunto de Dados:
- Nome do arquivo: ${dataset.meta.filename}
- Número de linhas: ${dataset.meta.n_rows}
- Número de colunas: ${dataset.meta.n_cols}
- Nomes das colunas: [${dataset.meta.columns.join(', ')}]
- Amostra de dados (primeiras linhas):
\`\`\`json
${JSON.stringify(dataset.sample, null, 2)}
\`\`\`
`;
};

interface GeminiAnalysisResponse {
    content: ChatContent[];
    suggestions: string[];
}

const processGeminiError = (error: unknown, context: 'análise inicial' | 'resposta de chat'): Error => {
    console.error(`Erro do Gemini durante ${context}:`, error);
    let userMessage = "Falha ao obter uma resposta válida do modelo de IA.";

    if (error instanceof SyntaxError) {
         userMessage = "A resposta do modelo de IA não estava em um formato JSON válido. Isso pode ser um problema temporário. Tente novamente.";
    } else if (error instanceof Error) {
        // Check for common API error messages from Google AI
        if (error.message.includes('API key not valid')) {
            userMessage = "A chave da API do Google AI não é válida. Por favor, verifique a configuração do ambiente.";
        } else if (error.message.toLowerCase().includes('safety')) {
             userMessage = "A sua pergunta ou a resposta do modelo foi bloqueada por motivos de segurança. Tente reformular a pergunta com termos diferentes.";
        } else if (error.message.toLowerCase().includes('timed out')) {
             userMessage = "A solicitação demorou muito para ser respondida. Verifique sua conexão com a internet ou tente novamente mais tarde.";
        } else {
            // Keep the original message if it's somewhat informative
            userMessage = `Ocorreu um erro na API: ${error.message}`;
        }
    } else {
        userMessage = "Ocorreu um erro desconhecido. Verifique o console para mais detalhes.";
    }
    return new Error(userMessage);
};


export const startChatSession = async (dataset: Dataset): Promise<GeminiAnalysisResponse> => {
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: baseSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: analysisResponseSchema,
        },
    });

    const initialPrompt = `
Realize uma análise exploratória inicial do conjunto de dados fornecido.
Forneça um resumo dos dados, identifique as principais características e gere pelo menos uma visualização relevante para começar.

${getDatasetContext(dataset)}
`;
    try {
        const response = await chat.sendMessage({ message: initialPrompt });

        const jsonText = response.text.trim();
        const cleanedJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsed = JSON.parse(cleanedJsonText);

        return {
            content: parseAnalysisParts(parsed.response || [], dataset),
            suggestions: parsed.followUpQuestions || []
        };
    } catch (error) {
        chat = null; // Reset on error
        throw processGeminiError(error, 'análise inicial');
    }
};

export const generateChatResponse = async (
    prompt: string,
    dataset: Dataset // Still needed for parsing chart data
): Promise<GeminiAnalysisResponse> => {
    if (!chat) {
        throw new Error("A sessão de chat não foi inicializada. Chame startChatSession primeiro.");
    }

    try {
        const response = await chat.sendMessage({ message: prompt });
        
        const jsonText = response.text.trim();
        const cleanedJsonText = jsonText.replace(/^```json\n?/, '').replace(/```$/, '');
        const parsed = JSON.parse(cleanedJsonText);

        return {
            content: parseAnalysisParts(parsed.response || [], dataset),
            suggestions: parsed.followUpQuestions || []
        };
    } catch (error) {
        throw processGeminiError(error, 'resposta de chat');
    }
};

export const clearChatSession = () => {
    chat = null;
};