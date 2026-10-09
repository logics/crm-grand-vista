# UI kit — Site de captação

Public-facing property site implied by the scope ("sites com foco em captação tendem a performar melhor quando combinam filtros relevantes, jornadas de conversão bem definidas e integração direta com o CRM").

**Important:** Grand Vista provided no existing website, codebase or Figma file. These three screens are a first visual interpretation built from the brand foundations, not a recreation.

## Files
| File | What it is |
| --- | --- |
| `index.html` | Click-through: home → listagem → ficha da fazenda, with lead form + toast |
| `SiteChrome.jsx` | Dark-green sticky header, footer, section heading |
| `HomeScreen.jsx` | Hero over the signage photo with scrim, search panel, destaques, como trabalhamos, regiões |
| `ListingScreen.jsx` | Filter sidebar (região, aptidão, área, infraestrutura) + 2-up FarmCard grid |
| `PropertyScreen.jsx` | Ficha pública: números-chave, abas técnicas, mapa placeholder, formulário de contato, similares |

Data comes from `../data.js`. Photography is a placeholder: the only real image available is the signage photo, used once in the hero. Every other image slot renders the sand placeholder — no stock or generated imagery was added.
