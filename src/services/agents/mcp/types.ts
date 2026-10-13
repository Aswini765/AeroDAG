/**
 * AeroDAG Model Context Protocol (MCP) Compatible Types
 * 
 * Provides an MCP-compliant interface specification allowing AeroDAG's
 * tool registry to map directly to standard MCP tools and servers.
 */

export interface McpJsonSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  properties?: Record<string, McpJsonSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface McpJsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  items?: McpJsonSchemaProperty;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpJsonSchema;
}

export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolContent {
  type: 'text' | 'resource';
  text?: string;
  data?: unknown;
}

export interface McpToolResult {
  content: McpToolContent[];
  isError?: boolean;
}

export interface McpServerAdapter {
  serverName: string;
  version: string;
  listTools(): Promise<McpToolDefinition[]>;
  callTool(call: McpToolCall): Promise<McpToolResult>;
}
