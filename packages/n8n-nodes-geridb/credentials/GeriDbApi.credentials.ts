import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class GeriDbApi implements ICredentialType {
  name = 'geriDbApi';
  displayName = 'GeriDB API';
  icon = 'file:../nodes/GeriDb/geridb.svg' as const;
  documentationUrl =
    'https://github.com/Geraldki94/geridb/blob/main/docs/N8N-VOICEBOT.md';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'http://host.docker.internal:3016',
      placeholder: 'https://geridb.example.com',
      description:
        'URL der GeriDB-Installation ohne abschließenden Schrägstrich',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description:
        'Optionaler GERIDB_API_KEY. Bei einer offenen lokalen Installation leer lassen.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/api/v1/tables',
    },
  };
}
