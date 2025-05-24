// Declare modules for eslint parser dependencies
declare module 'estree' {
  export interface Node {
    type: string;
    [key: string]: any;
  }
}

declare module 'json-schema' {
  interface JSONSchema4 {
    id?: string;
    $schema?: string;
    title?: string;
    description?: string;
    type?: string | string[];
    [key: string]: any;
  }
} 