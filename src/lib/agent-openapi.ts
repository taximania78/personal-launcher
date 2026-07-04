export const agentOpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Personnal Launcher — API agent',
    version: '1.0.0',
    description: 'API permettant à un agent IA de piloter le launcher : focus (par jour), to-do (création/report datés), journal quotidien, priorités de la semaine, habitudes, historique. Authentification par bearer token.',
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer' },
    },
    schemas: {
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          text: { type: 'string' },
          done: { type: 'boolean' },
          is_focus: { type: 'boolean' },
          position: { type: 'integer' },
        },
      },
      Habit: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          icon: { type: ['string', 'null'] },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/agent/state': {
      get: {
        summary: 'État courant : focus (jour + demain, done/why), todos (today/tomorrow/upcoming), triage, journal du jour, priorités de la semaine, habitudes (checks_last_7), coches du jour',
        responses: { '200': { description: 'État' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/focus': {
      put: {
        summary: 'Définir le focus d\'un jour (texte libre OU promotion d\'un todo existant)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            description: 'Fournir exactement un de text | todo_id. when accepte une date ISO (ex. vendredi → lundi).',
            properties: {
              text: { type: 'string', minLength: 1, maxLength: 280 },
              todo_id: { type: 'integer' },
              when: { type: 'string', default: 'today', description: "'today' | 'tomorrow' | 'YYYY-MM-DD'" },
              why: { type: 'string', maxLength: 280, description: 'Pourquoi ça compte (affiché sous le focus, écrit au journal)' },
            },
          } } },
        },
        responses: { '200': { description: '{ id, text, date }' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' }, '404': { description: 'todo_id introuvable' } },
      },
      delete: {
        summary: 'Effacer le focus d\'un jour (todo conservée, journal recalé sur not_set)',
        parameters: [
          { name: 'date', in: 'query', required: false, schema: { type: 'string', example: '2026-07-04' }, description: 'Défaut : aujourd\'hui' },
        ],
        responses: { '204': { description: 'Effacé' }, '400': { description: 'Date invalide' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/todos': {
      post: {
        summary: 'Créer une todo (today ou tomorrow)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['text'],
            properties: {
              text: { type: 'string', minLength: 1, maxLength: 280 },
              when: { type: 'string', enum: ['today', 'tomorrow'], default: 'today' },
              scheduled_for: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date libre (prime sur when) — placement des actions de la semaine' },
            },
          } } },
        },
        responses: { '200': { description: 'Todo créée' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/todos/{id}': {
      patch: {
        summary: 'Cocher/décocher (done), éditer le texte ou reporter (scheduled_for) une todo',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              done: { type: 'boolean' },
              text: { type: 'string', minLength: 1, maxLength: 280 },
              scheduled_for: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Reporter la todo (postponed_count incrémenté côté serveur si date ultérieure ; démote le focus)' },
            },
          } } },
        },
        responses: { '200': { description: 'Todo modifiée' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' }, '404': { description: 'Introuvable' } },
      },
      delete: {
        summary: 'Supprimer une todo',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'Supprimée' }, '401': { description: 'Non autorisé' }, '404': { description: 'Introuvable' } },
      },
    },
    '/api/agent/habits': {
      post: {
        summary: 'Créer une habitude',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 60 },
              icon: { type: ['string', 'null'], maxLength: 60 },
            },
          } } },
        },
        responses: { '200': { description: 'Habitude créée' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/habits/{id}/check': {
      post: {
        summary: 'Cocher/décocher une habitude pour un jour (défaut : aujourd’hui)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              day: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
              checked: { type: 'boolean', default: true },
            },
          } } },
        },
        responses: { '200': { description: '{ checked }' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' }, '404': { description: 'Introuvable' } },
      },
    },
    '/api/agent/journal/{date}': {
      get: {
        summary: 'Lire le journal d\'un jour (null si vierge)',
        parameters: [
          { name: 'date', in: 'path', required: true, schema: { type: 'string', example: '2026-07-04' } },
        ],
        responses: { '200': { description: 'DayJournal | null' }, '400': { description: 'Date invalide' }, '401': { description: 'Non autorisé' } },
      },
      put: {
        summary: 'Écrire le journal d\'un jour (upsert partiel — rituels shutdown/clôture dégradée)',
        parameters: [
          { name: 'date', in: 'path', required: true, schema: { type: 'string', example: '2026-07-04' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              focus_todo_id: { type: ['integer', 'null'] },
              focus_text: { type: ['string', 'null'] },
              why: { type: ['string', 'null'] },
              focus_outcome: { type: 'string', enum: ['done', 'reported', 'expired', 'not_set'] },
              report_reason: { type: ['string', 'null'], enum: ['trop_gros', 'imprevu', 'evite', 'plus_pertinent', 'autre', null] },
              report_comment: { type: ['string', 'null'] },
              deep_work: { type: ['boolean', 'null'] },
              shutdown_at: { type: ['string', 'null'], format: 'date-time' },
              shutdown_mode: { type: ['string', 'null'], enum: ['normal', 'degrade', null] },
            },
          } } },
        },
        responses: { '200': { description: 'Journal mis à jour' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/history': {
      get: {
        summary: 'Historique pour la revue hebdo : journaux + compte de coches par habitude',
        parameters: [
          { name: 'days', in: 'query', required: false, schema: { type: 'integer', default: 14, minimum: 1, maximum: 90 } },
        ],
        responses: { '200': { description: '{ days, journals[], habits[] }' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/week-priorities': {
      get: {
        summary: 'Priorités d\'une semaine (défaut : semaine courante)',
        parameters: [
          { name: 'week_start', in: 'query', required: false, schema: { type: 'string', example: '2026-06-29' }, description: 'Lundi de la semaine visée' },
        ],
        responses: { '200': { description: 'WeekPriority[]' }, '401': { description: 'Non autorisé' } },
      },
      post: {
        summary: 'Créer une priorité (3 max/semaine ; week_start permet de poser la semaine suivante le dimanche soir)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['text'],
            properties: {
              text: { type: 'string', minLength: 1, maxLength: 120 },
              week_start: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Doit être un lundi ; défaut : lundi courant' },
            },
          } } },
        },
        responses: { '200': { description: 'Créée' }, '400': { description: 'Corps invalide ou week_start non-lundi' }, '401': { description: 'Non autorisé' }, '409': { description: 'Limite de 3 atteinte' } },
      },
    },
    '/api/agent/week-priorities/{id}': {
      patch: {
        summary: 'Modifier une priorité (text, done, position)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              text: { type: 'string', minLength: 1, maxLength: 120 },
              done: { type: 'boolean' },
              position: { type: 'integer' },
            },
          } } },
        },
        responses: { '200': { description: 'Modifiée' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' }, '404': { description: 'Introuvable' } },
      },
      delete: {
        summary: 'Supprimer une priorité',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '204': { description: 'Supprimée' }, '401': { description: 'Non autorisé' }, '404': { description: 'Introuvable' } },
      },
    },
  },
} as const
