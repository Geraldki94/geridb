import type {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestOptions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

type GeriDbResponse = {
  records?: IDataObject[];
  record?: IDataObject;
  tables?: IDataObject[];
  deleted?: string;
};

export class GeriDb implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'GeriDB',
    name: 'geriDb',
    icon: {
      light: 'file:geridb.svg',
      dark: 'file:geridb.dark.svg',
    },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Datensätze in GeriDB suchen und verwalten',
    defaults: { name: 'GeriDB' },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'geriDbApi', required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Record', value: 'record' },
          { name: 'Table', value: 'table' },
        ],
        default: 'record',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['record'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create a record' },
          { name: 'Delete', value: 'delete', action: 'Delete a record' },
          {
            name: 'Get Many / Search',
            value: 'getMany',
            action: 'Get or search records',
          },
          { name: 'Update', value: 'update', action: 'Update a record' },
        ],
        default: 'getMany',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['table'] } },
        options: [{ name: 'Get Many', value: 'getMany', action: 'Get tables' }],
        default: 'getMany',
      },
      {
        displayName: 'Table ID',
        name: 'tableId',
        type: 'string',
        default: 'tbl_customers',
        required: true,
        displayOptions: { show: { resource: ['record'] } },
        description: 'ID aus der API-Ansicht in GeriDB',
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['record'], operation: ['getMany'] },
        },
        description:
          'Sucht in allen Feldern, zum Beispiel nach Telefonnummer oder E-Mail',
      },
      {
        displayName: 'Record ID',
        name: 'recordId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: { resource: ['record'], operation: ['update', 'delete'] },
        },
      },
      {
        displayName: 'Name / Company',
        name: 'company',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: { resource: ['record'], operation: ['create'] },
        },
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: { resource: ['record'], operation: ['create', 'update'] },
        },
        options: [
          {
            displayName: 'Company / Name',
            name: 'company',
            type: 'string',
            default: '',
          },
          {
            displayName: 'Contact',
            name: 'contact',
            type: 'string',
            default: '',
          },
          { displayName: 'Date', name: 'date', type: 'dateTime', default: '' },
          {
            displayName: 'Email',
            name: 'email',
            type: 'string',
            default: '',
            placeholder: 'name@email.com',
          },
          {
            displayName: 'Notes',
            name: 'notes',
            type: 'string',
            typeOptions: { rows: 3 },
            default: '',
          },
          { displayName: 'Phone', name: 'phone', type: 'string', default: '' },
          {
            displayName: 'Status',
            name: 'status',
            type: 'options',
            options: [
              { name: 'Active', value: 'Aktiv' },
              { name: 'Contact', value: 'Kontakt' },
              { name: 'Offer', value: 'Angebot' },
              { name: 'Paused', value: 'Pausiert' },
            ],
            default: 'Kontakt',
          },
          { displayName: 'Value', name: 'value', type: 'number', default: 0 },
        ],
      },
      {
        displayName: 'Additional JSON Fields',
        name: 'additionalFieldsJson',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: { resource: ['record'], operation: ['create', 'update'] },
        },
        description:
          'Optionale benutzerdefinierte GeriDB-Feldschlüssel als JSON-Objekt',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const output: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('geriDbApi');
    const baseUrl = String(credentials.baseUrl).replace(/\/$/, '');

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const resource = this.getNodeParameter('resource', itemIndex) as string;
      const operation = this.getNodeParameter('operation', itemIndex) as string;
      const options: IHttpRequestOptions = {
        method: 'GET',
        url: `${baseUrl}/api/v1/${resource === 'table' ? 'tables' : 'records'}`,
        json: true,
      };

      if (resource === 'record') {
        const tableId = this.getNodeParameter('tableId', itemIndex) as string;
        options.qs = { table: tableId };
        if (operation === 'getMany') {
          const search = this.getNodeParameter(
            'search',
            itemIndex,
            '',
          ) as string;
          if (search) options.qs.search = search;
        } else if (operation === 'delete') {
          options.method = 'DELETE';
          options.qs.id = this.getNodeParameter(
            'recordId',
            itemIndex,
          ) as string;
        } else {
          options.method = operation === 'create' ? 'POST' : 'PATCH';
          const fields = this.getNodeParameter(
            'fields',
            itemIndex,
            {},
          ) as IDataObject;
          const additional = JSON.parse(
            this.getNodeParameter(
              'additionalFieldsJson',
              itemIndex,
              '{}',
            ) as string,
          ) as IDataObject;
          const body: IDataObject = { ...additional, ...fields };
          if (operation === 'create') {
            body.company = this.getNodeParameter(
              'company',
              itemIndex,
            ) as string;
          } else {
            body.id = this.getNodeParameter('recordId', itemIndex) as string;
          }
          options.body = body;
        }
      }

      const response = (await this.helpers.httpRequestWithAuthentication.call(
        this,
        'geriDbApi',
        options,
      )) as GeriDbResponse;
      const values = response.records || response.tables;
      if (values) {
        output.push(
          ...values.map((json) => ({ json, pairedItem: { item: itemIndex } })),
        );
      } else {
        output.push({
          json:
            response.record || ({ deleted: response.deleted } as IDataObject),
          pairedItem: { item: itemIndex },
        });
      }
    }

    return [output];
  }
}
