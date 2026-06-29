export const agentOpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Personnal Launcher — API agent',
    version: '1.0.0',
    description: 'API permettant à un agent IA de lire et modifier le focus, la to-do et les habitudes. Authentification par bearer token.',
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
        summary: 'État courant (focus, todos today/tomorrow, habitudes, coches du jour)',
        responses: { '200': { description: 'État' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/focus': {
      put: {
        summary: 'Définir le focus du jour (texte libre)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['text'],
            properties: { text: { type: 'string', minLength: 1, maxLength: 280 } },
          } } },
        },
        responses: { '200': { description: 'Focus créé' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' } },
      },
      delete: {
        summary: 'Effacer le focus du jour',
        responses: { '204': { description: 'Effacé' }, '401': { description: 'Non autorisé' } },
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
            },
          } } },
        },
        responses: { '200': { description: 'Todo créée' }, '400': { description: 'Corps invalide' }, '401': { description: 'Non autorisé' } },
      },
    },
    '/api/agent/todos/{id}': {
      patch: {
        summary: 'Cocher/décocher (done) ou éditer le texte d’une todo',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { done: { type: 'boolean' }, text: { type: 'string', minLength: 1, maxLength: 280 } },
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
  },
} as const
